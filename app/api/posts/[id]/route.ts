import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { canDeletePost, canEditPost } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { calculateReadTime, sanitizeBlogHtml, serializePost } from "@/lib/blog";
import { jsonError } from "@/lib/api";
import { connectToDatabase } from "@/lib/db";
import { BlogPostModel } from "@/lib/models/blog-post";
import { savePostSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const session = await getSession();

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;

  await connectToDatabase();
  const post = await BlogPostModel.findById(id);

  if (!post) {
    return jsonError("Post not found.", 404);
  }

  if (!canEditPost(session, post)) {
    return jsonError("You do not have access to this post.", 403);
  }

  return NextResponse.json({ post: serializePost(post) });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSession();

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;
  const payload = await request.json();
  const parsed = savePostSchema.safeParse({
    ...payload,
    slug: slugify(payload.slug || payload.title || ""),
  });

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid post request");
  }

  await connectToDatabase();

  const post = await BlogPostModel.findById(id);

  if (!post) {
    return jsonError("Post not found.", 404);
  }

  if (!canEditPost(session, post)) {
    return jsonError("You do not have access to edit this post.", 403);
  }

  const existing = await BlogPostModel.findOne({
    slug: parsed.data.slug,
    _id: { $ne: post._id },
  });

  if (existing) {
    return jsonError("A post with that slug already exists.", 409);
  }

  post.title = parsed.data.title;
  post.slug = parsed.data.slug;
  post.excerpt = parsed.data.excerpt;
  post.seoTitle = parsed.data.seoTitle;
  post.seoDescription = parsed.data.seoDescription;
  post.category = parsed.data.category;
  post.tags = Array.from(new Set(parsed.data.tags));
  post.keyTakeaways = Array.from(new Set(parsed.data.keyTakeaways));
  post.coverImageUrl = parsed.data.coverImageUrl;
  post.coverImageAlt = parsed.data.coverImageAlt;
  const sanitizedHtml = sanitizeBlogHtml(parsed.data.contentHtml);

  post.contentHtml = sanitizedHtml;
  post.readTimeText = calculateReadTime(sanitizedHtml);
  post.editorMode = parsed.data.editorMode;
  post.authorName = parsed.data.authorName;
  post.authorRole = parsed.data.authorRole;
  post.status = parsed.data.status;
  post.updatedBy = new Types.ObjectId(session.userId);
  post.publishedAt =
    parsed.data.status === "PUBLISHED"
      ? parsed.data.publishedAt
        ? new Date(parsed.data.publishedAt)
        : post.publishedAt || new Date()
      : null;

  await post.save();

  return NextResponse.json({ post: serializePost(post) });
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const session = await getSession();

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;

  await connectToDatabase();

  const post = await BlogPostModel.findById(id);

  if (!post) {
    return jsonError("Post not found.", 404);
  }

  if (!canDeletePost(session, post)) {
    return jsonError("You do not have access to delete this post.", 403);
  }

  await post.deleteOne();

  return NextResponse.json({ ok: true });
}
