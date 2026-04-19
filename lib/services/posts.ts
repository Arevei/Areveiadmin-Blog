import { Types } from "mongoose";

import type { SessionUser } from "@/lib/auth/session";
import { canManageAllPosts } from "@/lib/auth/permissions";
import { calculateReadTime, serializePostCard } from "@/lib/blog";
import { connectToDatabase } from "@/lib/db";
import { BlogPostModel } from "@/lib/models/blog-post";

type PublicPostCardRecord = {
  _id: { toString(): string } | string;
  title: string;
  slug: string;
  excerpt: string;
  authorName: string;
  authorRole: string;
  category: string;
  tags: string[];
  coverImageUrl: string;
  coverImageAlt?: string;
  publishedAt?: Date | null;
  updatedAt: Date;
  createdAt: Date;
  readTimeText?: string;
};

const publicPostCardProjection = {
  title: 1,
  slug: 1,
  excerpt: 1,
  authorName: 1,
  authorRole: 1,
  category: 1,
  tags: 1,
  coverImageUrl: 1,
  coverImageAlt: 1,
  publishedAt: 1,
  updatedAt: 1,
  createdAt: 1,
  readTimeText: 1,
} as const;

function normalizePublicSlug(slug: string) {
  return decodeURIComponent(slug)
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

async function resolveMissingReadTimes(posts: PublicPostCardRecord[]) {
  const missingIds = posts
    .filter((post) => !post.readTimeText?.trim())
    .map((post) => post._id);

  if (missingIds.length === 0) {
    return posts;
  }

  const legacyPosts = await BlogPostModel.find(
    { _id: { $in: missingIds } },
    { contentHtml: 1, readTimeText: 1 }
  ).lean();

  const readTimeById = new Map(
    legacyPosts.map((post) => [
      String(post._id),
      post.readTimeText?.trim() ? post.readTimeText : calculateReadTime(post.contentHtml || ""),
    ])
  );

  return posts.map((post) => ({
    ...post,
    readTimeText: post.readTimeText?.trim() || readTimeById.get(String(post._id)) || "1 min read",
  }));
}

function normalizeProjectedCards(posts: PublicPostCardRecord[]) {
  return posts.map((post) =>
    serializePostCard({
      ...post,
      readTimeText: post.readTimeText || "1 min read",
    })
  );
}

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

  const posts = await BlogPostModel.find(filter, publicPostCardProjection)
    .sort({ publishedAt: -1, updatedAt: -1 })
    .lean();

  return resolveMissingReadTimes(posts);
}

export async function getPublicPostBySlug(slug: string) {
  await connectToDatabase();
  return BlogPostModel.findOne({
    slug: normalizePublicSlug(slug),
    status: "PUBLISHED",
  });
}

export async function getRelatedPosts(slug: string, category: string, tags: string[], limit = 3) {
  await connectToDatabase();

  const posts = await BlogPostModel.find({
    status: "PUBLISHED",
    slug: { $ne: slug },
    $or: [{ category }, { tags: { $in: tags } }],
  }, publicPostCardProjection)
    .sort({ publishedAt: -1, updatedAt: -1 })
    .limit(limit * 2)
    .lean();

  return (await resolveMissingReadTimes(posts))
    .sort((left, right) => {
      const leftScore =
        Number(left.category === category) * 3 + left.tags.filter((tag) => tags.includes(tag)).length;
      const rightScore =
        Number(right.category === category) * 3 +
        right.tags.filter((tag) => tags.includes(tag)).length;

      return rightScore - leftScore;
    })
    .slice(0, limit);
}

export function serializePublicPostCards(posts: PublicPostCardRecord[]) {
  return normalizeProjectedCards(posts);
}
