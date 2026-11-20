import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { AI_NOT_CONFIGURED, describeAiError, getAnthropic, isAiConfigured } from "@/lib/ai/client";
import { AI_MODEL, OPTIMIZE_SCHEMA, OPTIMIZE_SYSTEM } from "@/lib/ai/prompts";
import { jsonError } from "@/lib/api";
import { canEditPost } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { prepareArticle, stripHtml } from "@/lib/blog";
import { connectToDatabase } from "@/lib/db";
import { triggerSiteRebuild } from "@/lib/deploy";
import { BlogPostModel } from "@/lib/models/blog-post";
import { META_LIMITS, findMetaIssues, type PostMeta } from "@/lib/seo/meta-issues";

export const runtime = "nodejs";
export const maxDuration = 120;

type Suggestion = {
  title: string;
  excerpt: string;
  focusKeyword: string;
  seoTitle: string;
  seoDescription: string;
  keyTakeaways: string[];
  tags: string[];
  coverImageAlt: string;
  faqs: { question: string; answer: string }[];
  summary: string;
};

const clean = (value: unknown) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");
const cleanList = (value: unknown, max: number, itemMax: number) =>
  Array.isArray(value)
    ? value.map(clean).filter((item) => item.length > 0 && item.length <= itemMax).slice(0, max)
    : [];

/**
 * Improves the headline and search fields of one existing post. The body, slug,
 * status and publish date are never touched. A suggested field is only accepted
 * when it is inside its limit; otherwise the current value is kept, so a bad
 * model answer cannot make a post worse.
 *
 * Body: { id, apply?: boolean, rebuild?: boolean }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isAiConfigured()) return jsonError(AI_NOT_CONFIGURED, 503);

  const body = (await request.json().catch(() => null)) as { id?: unknown; apply?: unknown; rebuild?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!Types.ObjectId.isValid(id)) return jsonError("Unknown post.");

  await connectToDatabase();
  const post = await BlogPostModel.findById(id);
  if (!post) return jsonError("Post not found.", 404);
  if (!canEditPost(session, post)) return jsonError("You do not have access to edit this post.", 403);

  const article = prepareArticle(post.contentHtml, post.title);
  const manualFaqs = (post.faqs || []).length;
  const needsFaqs = manualFaqs === 0 && article.faqs.length === 0;

  const before: PostMeta & { faqs: number } = {
    title: post.title,
    excerpt: post.excerpt,
    seoTitle: post.seoTitle || "",
    seoDescription: post.seoDescription || "",
    focusKeyword: post.focusKeyword || "",
    keyTakeaways: post.keyTakeaways,
    tags: post.tags,
    coverImageAlt: post.coverImageAlt || "",
    faqs: manualFaqs || article.faqs.length,
  };
  const issuesBefore = findMetaIssues(before);

  const headings = article.toc.filter((item) => item.level === 2).map((item) => `- ${item.text}`).join("\n");

  let suggestion: Suggestion;
  try {
    const message = await getAnthropic().messages.create({
      model: AI_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: { type: "json_schema", schema: OPTIMIZE_SCHEMA } },
      system: OPTIMIZE_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            "Current values:",
            JSON.stringify(
              {
                title: before.title,
                excerpt: before.excerpt,
                focusKeyword: before.focusKeyword,
                seoTitle: before.seoTitle,
                seoDescription: before.seoDescription,
                keyTakeaways: before.keyTakeaways,
                tags: before.tags,
                coverImageAlt: before.coverImageAlt,
              },
              null,
              2,
            ),
            issuesBefore.length > 0 ? `Problems to fix:\n${issuesBefore.map((issue) => `- ${issue}`).join("\n")}` : "No problems were detected; only improve what clearly needs it.",
            needsFaqs ? "FAQs: requested. The article has no FAQ section." : "FAQs: not requested. Return an empty list.",
            `Section headings in the article:\n${headings || "(none)"}`,
            `Article text:\n${stripHtml(article.contentHtml)}`,
          ].join("\n\n"),
        },
      ],
    });

    if (message.stop_reason === "refusal") return jsonError("The AI declined to edit this post.", 422);
    const block = message.content.find((item) => item.type === "text");
    suggestion = JSON.parse(block?.type === "text" ? block.text : "{}") as Suggestion;
  } catch (error) {
    return jsonError(describeAiError(error), 502);
  }

  const within = (value: string, min: number, max: number, fallback: string) =>
    value.length >= min && value.length <= max ? value : fallback;

  const takeaways = cleanList(suggestion.keyTakeaways, 5, META_LIMITS.takeawayMax);
  const tags = Array.from(new Set(cleanList(suggestion.tags, 6, 40).map((tag) => tag.toLowerCase())));
  const faqs = needsFaqs
    ? (Array.isArray(suggestion.faqs) ? suggestion.faqs : [])
        .map((faq) => ({ question: clean(faq?.question), answer: clean(faq?.answer) }))
        .filter((faq) => faq.question.length >= 8 && faq.answer.length >= 20)
        .slice(0, 5)
    : [];

  const after: PostMeta & { faqs: number } = {
    title: within(clean(suggestion.title), 15, META_LIMITS.titleMax, before.title),
    excerpt: within(clean(suggestion.excerpt), 60, META_LIMITS.excerptMax + 20, before.excerpt),
    focusKeyword: within(clean(suggestion.focusKeyword), 3, 80, before.focusKeyword || ""),
    seoTitle: within(clean(suggestion.seoTitle), 15, META_LIMITS.seoTitleMax, before.seoTitle || ""),
    seoDescription: within(clean(suggestion.seoDescription), 90, META_LIMITS.seoDescriptionMax + 5, before.seoDescription || ""),
    keyTakeaways: takeaways.length >= META_LIMITS.takeawaysMin ? takeaways : before.keyTakeaways,
    tags: tags.length >= META_LIMITS.tagsMin ? tags : before.tags,
    coverImageAlt: within(clean(suggestion.coverImageAlt), 8, 140, before.coverImageAlt || ""),
    faqs: faqs.length >= 3 ? faqs.length : before.faqs,
  };
  const issuesAfter = findMetaIssues(after);
  const applied = body?.apply === true;

  if (applied) {
    post.set({
      title: after.title,
      excerpt: after.excerpt,
      focusKeyword: after.focusKeyword,
      seoTitle: after.seoTitle,
      seoDescription: after.seoDescription,
      keyTakeaways: after.keyTakeaways,
      tags: after.tags,
      coverImageAlt: after.coverImageAlt,
      ...(faqs.length >= 3 ? { faqs } : {}),
      updatedBy: new Types.ObjectId(session.userId),
    });
    await post.save();
    // In a batch the caller asks for one rebuild at the end instead of one per post.
    if (post.status === "PUBLISHED" && body?.rebuild !== false) triggerSiteRebuild();
  }

  return NextResponse.json({
    id,
    applied,
    before,
    after,
    issuesBefore,
    issuesAfter,
    summary: clean(suggestion.summary),
  });
}
