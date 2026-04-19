import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { calculateReadTime, sanitizeBlogHtml, serializePost } from "@/lib/blog";
import { jsonError } from "@/lib/api";
import { connectToDatabase } from "@/lib/db";
import { BlogPostModel } from "@/lib/models/blog-post";
import { getAccessiblePosts } from "@/lib/services/posts";
import { savePostSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const posts = await getAccessiblePosts(session);

  return NextResponse.json({
    posts: posts.map(serializePost),
  });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const payload = await request.json();
  const parsed = savePostSchema.safeParse({
    ...payload,
    slug: slugify(payload.slug || payload.title || ""),
  });

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid post request");
  }

  await connectToDatabase();

  const existing = await BlogPostModel.findOne({ slug: parsed.data.slug });

  if (existing) {
    return jsonError("A post with that slug already exists.", 409);
  }

  const createdBy = new Types.ObjectId(session.userId);

  const sanitizedHtml = sanitizeBlogHtml(parsed.data.contentHtml);

  const post = await BlogPostModel.create({
    ...parsed.data,
    tags: Array.from(new Set(parsed.data.tags)),
    keyTakeaways: Array.from(new Set(parsed.data.keyTakeaways)),
    contentHtml: sanitizedHtml,
    readTimeText: calculateReadTime(sanitizedHtml),
    publishedAt:
      parsed.data.status === "PUBLISHED"
        ? parsed.data.publishedAt
          ? new Date(parsed.data.publishedAt)
          : new Date()
        : null,
    createdBy,
    updatedBy: createdBy,
  });

  return NextResponse.json({ post: serializePost(post) }, { status: 201 });
}
