import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { serializePost } from "@/lib/blog";
import { jsonError } from "@/lib/api";
import { connectToDatabase } from "@/lib/db";
import { BlogPostModel } from "@/lib/models/blog-post";
import { getAccessiblePosts } from "@/lib/services/posts";
import { writePost } from "@/lib/services/save-post";
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

  const post = await writePost(parsed.data, session);

  return NextResponse.json({ post: serializePost(post) }, { status: 201 });
}
