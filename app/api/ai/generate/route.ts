import { AI_NOT_CONFIGURED, describeAiError, getAnthropic, isAiConfigured } from "@/lib/ai/client";
import { AI_MODEL, buildWriterSystemPrompt, buildWriterUserPrompt } from "@/lib/ai/prompts";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { prepareArticle } from "@/lib/blog";
import { connectToDatabase } from "@/lib/db";
import { BlogPostModel } from "@/lib/models/blog-post";
import { slugify } from "@/lib/utils";
import { generatePostSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const maxDuration = 300;

const SERVICE_LINKS = [
  "Website Development services — /services/website-development",
  "Product Development services — /services/product-development",
  "AI Agents & Automation services — /services/ai-agents-automation",
  "Design services — /services/design",
  "Marketing services — /services/marketing",
  "Arevei AI Native (AI sales manager) — /ai-native",
  "Book a free strategy meeting — /meet",
];

function between(text: string, tag: string) {
  const open = text.indexOf(`<${tag}>`);
  if (open === -1) return "";
  const close = text.lastIndexOf(`</${tag}>`);
  return text.slice(open + tag.length + 2, close === -1 ? undefined : close).trim();
}

function asStringList(value: unknown, max: number) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "").slice(0, max)
    : [];
}

/**
 * Streams a full draft as newline-delimited JSON:
 *   {"type":"delta","text":"..."}   raw model text, for live progress
 *   {"type":"done","post":{...}}    the parsed draft, already normalized
 *   {"type":"error","message":"..."}
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isAiConfigured()) return jsonError(AI_NOT_CONFIGURED, 503);

  const parsed = generatePostSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    // One message per field, so the form can mark every field that failed.
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fields[key]) fields[key] = issue.message;
    }
    const messages = Object.values(fields);
    return Response.json(
      { error: messages.length ? messages.join(" ") : "The brief is not valid.", fields },
      { status: 400 },
    );
  }

  await connectToDatabase();
  const published = await BlogPostModel.find({ status: "PUBLISHED" }, { title: 1, slug: 1, category: 1 })
    .sort({ publishedAt: -1 })
    .limit(40)
    .lean();

  const internalLinks = [...SERVICE_LINKS, ...published.map((post) => `${post.title} — /blog/${post.slug}`)];
  const existingCategories = Array.from(new Set(published.map((post) => post.category))).slice(0, 20);

  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      try {
        const stream = getAnthropic().beta.messages.stream(
          {
            model: AI_MODEL,
            max_tokens: 32000,
            thinking: { type: "adaptive" },
            output_config: { effort: "medium" },
            // If a safety classifier declines, the API retries on a fallback model in the same call.
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            system: [
              // Stable across requests until a post is published, so repeat drafts read it from cache.
              { type: "text", text: buildWriterSystemPrompt(internalLinks), cache_control: { type: "ephemeral" } },
            ],
            messages: [{ role: "user", content: buildWriterUserPrompt({ ...parsed.data, existingCategories }) }],
          },
          { signal: request.signal },
        );

        stream.on("text", (text) => send({ type: "delta", text }));

        const message = await stream.finalMessage();

        if (message.stop_reason === "refusal") {
          send({ type: "error", message: "The AI declined this brief. Rephrase the topic and try again." });
          return;
        }

        const text = message.content.map((block) => (block.type === "text" ? block.text : "")).join("");
        const articleHtml = between(text, "article");

        if (!articleHtml) {
          send({ type: "error", message: "The AI response did not contain an article. Try again." });
          return;
        }

        let meta: Record<string, unknown> = {};
        try {
          meta = JSON.parse(between(text, "meta")) as Record<string, unknown>;
        } catch {
          // The article is still usable; the editor can fill metadata with "Generate SEO".
        }

        const str = (key: string) => (typeof meta[key] === "string" ? (meta[key] as string).trim() : "");
        const title = str("title") || parsed.data.topic;
        const article = prepareArticle(articleHtml, title);

        send({
          type: "done",
          truncated: message.stop_reason === "max_tokens",
          post: {
            title,
            slug: slugify(str("slug") || title),
            excerpt: str("excerpt"),
            seoTitle: str("seoTitle"),
            seoDescription: str("seoDescription"),
            focusKeyword: str("focusKeyword") || parsed.data.primaryKeyword,
            category: parsed.data.category || str("category"),
            tags: asStringList(meta.tags, 8),
            keyTakeaways: asStringList(meta.keyTakeaways, 4),
            coverImageAlt: str("coverImageAlt"),
            contentHtml: article.contentHtml,
            faqs: article.faqs,
            wordCount: article.wordCount,
          },
        });
      } catch (error) {
        if (!request.signal.aborted) send({ type: "error", message: describeAiError(error) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
