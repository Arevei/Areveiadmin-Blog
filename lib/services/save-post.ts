import { Types } from "mongoose";
import type { z } from "zod";

import type { SessionUser } from "@/lib/auth/session";
import { prepareArticle } from "@/lib/blog";
import { triggerSiteRebuild } from "@/lib/deploy";
import { BlogPostModel, type BlogPostDocument } from "@/lib/models/blog-post";
import type { savePostSchema } from "@/lib/validators";

type SaveInput = z.infer<typeof savePostSchema>;

/** One write path for create and update, so both store exactly what the site will render. */
export async function writePost(input: SaveInput, session: SessionUser, existing?: BlogPostDocument) {
  const article = prepareArticle(input.contentHtml, input.title, input.faqs);
  const userId = new Types.ObjectId(session.userId);
  const wasPublished = existing?.status === "PUBLISHED";

  const publishedAt =
    input.status === "PUBLISHED"
      ? input.publishedAt
        ? new Date(input.publishedAt)
        : existing?.publishedAt || new Date()
      : null;

  const fields = {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    focusKeyword: input.focusKeyword,
    noindex: input.noindex,
    faqs: input.faqs,
    category: input.category,
    tags: Array.from(new Set(input.tags)),
    keyTakeaways: Array.from(new Set(input.keyTakeaways)),
    coverImageUrl: input.coverImageUrl,
    coverImageAlt: input.coverImageAlt,
    contentHtml: article.contentHtml,
    readTimeText: article.readTimeText,
    wordCount: article.wordCount,
    editorMode: input.editorMode,
    authorName: input.authorName,
    authorRole: input.authorRole,
    status: input.status,
    publishedAt,
    updatedBy: userId,
  };

  let post: BlogPostDocument;

  if (existing) {
    existing.set(fields);
    post = await existing.save();
  } else {
    post = await BlogPostModel.create({ ...fields, createdBy: userId });
  }

  if (wasPublished || post.status === "PUBLISHED") triggerSiteRebuild();

  return post;
}
