import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { prepareArticle } from "@/lib/blog";

/**
 * Returns exactly what would be stored and served for the given draft HTML.
 * The editor preview and paste clean-up both call this, so "what I see in the
 * admin" and "what the site renders" come from the same function.
 */
export async function POST(request: Request) {
  if (!(await getSession())) return jsonError("Unauthorized", 401);

  const body = (await request.json().catch(() => null)) as { contentHtml?: unknown; title?: unknown } | null;
  const contentHtml = typeof body?.contentHtml === "string" ? body.contentHtml : "";
  const title = typeof body?.title === "string" ? body.title : "";

  if (contentHtml.length > 600_000) return jsonError("Content is too large to render.", 413);

  return NextResponse.json(prepareArticle(contentHtml, title));
}
