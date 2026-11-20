import { NextResponse } from "next/server";

import { canDeletePost, canEditPost } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { serializePost } from "@/lib/blog";
import { jsonError } from "@/lib/api";
import { connectToDatabase } from "@/lib/db";
import { BlogPostModel } from "@/lib/models/blog-post";
import { writePost } from "@/lib/services/save-post";
import { triggerSiteRebuild } from "@/lib/deploy";
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

  const saved = await writePost(parsed.data, session, post);

  return NextResponse.json({ post: serializePost(saved) });
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

  const wasPublished = post.status === "PUBLISHED";
  await post.deleteOne();
  if (wasPublished) triggerSiteRebuild();

  return NextResponse.json({ ok: true });
}
