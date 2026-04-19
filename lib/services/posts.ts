import { Types } from "mongoose";

import type { SessionUser } from "@/lib/auth/session";
import { canManageAllPosts } from "@/lib/auth/permissions";
import { serializePost } from "@/lib/blog";
import { connectToDatabase } from "@/lib/db";
import { BlogPostModel } from "@/lib/models/blog-post";

export async function getAccessiblePosts(user: SessionUser) {
  await connectToDatabase();

  const filter = canManageAllPosts(user.role) ? {} : { createdBy: new Types.ObjectId(user.userId) };

  return BlogPostModel.find(filter).sort({ updatedAt: -1 });
}

export async function getAccessiblePostById(id: string, user: SessionUser) {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(id)) {
    return null;
  }

  const post = await BlogPostModel.findById(id);

  if (!post) {
    return null;
  }

  if (!canManageAllPosts(user.role) && post.createdBy.toString() !== user.userId) {
    return null;
  }

  return post;
}

export async function getPublicPosts(category?: string) {
  await connectToDatabase();

  const filter = category ? { status: "PUBLISHED", category } : { status: "PUBLISHED" };

  return BlogPostModel.find(filter).sort({ publishedAt: -1, updatedAt: -1 });
}

export async function getPublicPostBySlug(slug: string) {
  await connectToDatabase();
  return BlogPostModel.findOne({ slug, status: "PUBLISHED" });
}

export async function getRelatedPosts(slug: string, category: string, tags: string[], limit = 3) {
  await connectToDatabase();

  const posts = await BlogPostModel.find({
    status: "PUBLISHED",
    slug: { $ne: slug },
    $or: [{ category }, { tags: { $in: tags } }],
  })
    .sort({ publishedAt: -1, updatedAt: -1 })
    .limit(limit * 2);

  return posts
    .sort((left, right) => {
      const leftScore =
        Number(left.category === category) * 3 + left.tags.filter((tag) => tags.includes(tag)).length;
      const rightScore =
        Number(right.category === category) * 3 +
        right.tags.filter((tag) => tags.includes(tag)).length;

      return rightScore - leftScore;
    })
    .slice(0, limit)
    .map(serializePost);
}
