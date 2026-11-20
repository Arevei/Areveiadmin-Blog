import { NextResponse } from "next/server";

import { AI_NOT_CONFIGURED, describeAiError, getAnthropic, isAiConfigured } from "@/lib/ai/client";
import {
  AI_MODEL,
  REWRITE_INSTRUCTIONS,
  REWRITE_SYSTEM,
  SEO_ASSIST_SCHEMA,
  SEO_ASSIST_SYSTEM,
} from "@/lib/ai/prompts";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { prepareArticle, stripHtml } from "@/lib/blog";
import { assistSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Small, fast helpers that work on an existing draft: SEO metadata and passage edits. */
export async function POST(request: Request) {
  if (!(await getSession())) return jsonError("Unauthorized", 401);
  if (!isAiConfigured()) return jsonError(AI_NOT_CONFIGURED, 503);

  const parsed = assistSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Invalid request");

  const { action, title, focusKeyword, contentHtml, selection } = parsed.data;
  const client = getAnthropic();

  try {
    if (action === "seo") {
      const text = stripHtml(contentHtml);
      if (text.length < 300) return jsonError("Write more of the article first, then generate SEO from it.");

      const message = await client.messages.create({
        model: AI_MODEL,
        max_tokens: 4000,
        output_config: { effort: "low", format: { type: "json_schema", schema: SEO_ASSIST_SCHEMA } },
        system: SEO_ASSIST_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Title: ${title || "(untitled)"}\n${focusKeyword ? `Primary keyword chosen by the editor: ${focusKeyword}\n` : ""}\nArticle:\n${text}`,
          },
        ],
      });

      if (message.stop_reason === "refusal") return jsonError("The AI declined this request.", 422);

      const block = message.content.find((item) => item.type === "text");
      return NextResponse.json({ seo: JSON.parse(block?.type === "text" ? block.text : "{}") });
    }

    if (!selection.trim()) return jsonError("Select the passage you want to change first.");

    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 8000,
      output_config: { effort: "low" },
      system: REWRITE_SYSTEM,
      messages: [
        {
          role: "user",
          content: `${REWRITE_INSTRUCTIONS[action]}\n\nArticle title, for context: ${title || "(untitled)"}\n\nPassage:\n${selection}`,
        },
      ],
    });

    if (message.stop_reason === "refusal") return jsonError("The AI declined this request.", 422);

    const html = message.content.map((item) => (item.type === "text" ? item.text : "")).join("");
    return NextResponse.json({ html: prepareArticle(html, "").contentHtml });
  } catch (error) {
    return jsonError(describeAiError(error), 502);
  }
}
