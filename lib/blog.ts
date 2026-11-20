import { normalizeArticleHtml, type FaqItem } from "@/lib/content/normalize";
import type { BlogPost, BlogPostDocument } from "@/lib/models/blog-post";
import { formatDate } from "@/lib/utils";

/**
 * Runs content through the shared article pipeline and derives everything that
 * depends on it. Used on save, on read (so legacy posts are cleaned without a
 * migration) and by the live preview, which is why the three always agree.
 */
export function prepareArticle(contentHtml: string, title: string, manualFaqs: FaqItem[] = []) {
  const article = normalizeArticleHtml(contentHtml, { title });

  return {
    contentHtml: article.html,
    toc: article.toc,
    faqs: manualFaqs.length > 0 ? manualFaqs : article.faqs,
    wordCount: article.wordCount,
    readTimeText: `${article.readTimeMinutes} min read`,
  };
}

export function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function calculateReadTime(html: string) {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min read`;
}

type BlogPostIdentity = {
  _id?: { toString(): string } | string;
  createdBy?: { toString(): string } | string;
  updatedBy?: { toString(): string } | string;
};

type BlogPostBaseSource = Pick<
  BlogPost,
  | "slug"
  | "title"
  | "excerpt"
  | "authorName"
  | "category"
  | "tags"
  | "coverImageUrl"
  | "coverImageAlt"
  | "publishedAt"
  | "updatedAt"
  | "createdAt"
  | "readTimeText"
>;

type BlogPostSummarySource = BlogPostBaseSource & BlogPostIdentity;

type BlogPostDetailSource = BlogPostSummarySource &
  Pick<
    BlogPost,
    | "contentHtml" | "keyTakeaways" | "editorMode" | "authorRole" | "seoTitle" | "seoDescription" | "status"
    | "focusKeyword" | "noindex" | "faqs"
  >;

function toStringId(value?: { toString(): string } | string) {
  if (!value) return "";
  return typeof value === "string" ? value : value.toString();
}

function resolvePublishedAt(post: Pick<BlogPost, "publishedAt" | "updatedAt" | "createdAt">) {
  return post.publishedAt || post.updatedAt || post.createdAt;
}

function resolveReadTime(post: { readTimeText?: string; contentHtml?: string }) {
  if (post.readTimeText?.trim()) {
    return post.readTimeText;
  }

  return post.contentHtml ? calculateReadTime(post.contentHtml) : "1 min read";
}

export function serializePostCard(post: BlogPostSummarySource) {
  const publishedAt = post.publishedAt || post.updatedAt || post.createdAt;

  return {
    id: toStringId(post._id),
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    author: post.authorName,
    date: formatDate(publishedAt),
    publishedAt: resolvePublishedAt(post).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    readTime: resolveReadTime(post),
    category: post.category,
    tags: post.tags,
    thumbnail: post.coverImageUrl,
    thumbnailAlt: post.coverImageAlt || post.title,
  };
}

export function serializePost(post: BlogPostDetailSource | BlogPostDocument) {
  const publishedAt = resolvePublishedAt(post);
  const article = prepareArticle(
    post.contentHtml,
    post.title,
    (post.faqs || []).map((faq) => ({ question: faq.question, answer: faq.answer })),
  );

  return {
    ...serializePostCard(post),
    readTime: article.readTimeText,
    contentHtml: article.contentHtml,
    toc: article.toc,
    faqs: article.faqs,
    wordCount: article.wordCount,
    focusKeyword: post.focusKeyword || "",
    noindex: Boolean(post.noindex),
    seoTitle: post.seoTitle || "",
    seoDescription: post.seoDescription || "",
    authorRole: post.authorRole,
    keyTakeaways: post.keyTakeaways,
    status: post.status,
    editorMode: post.editorMode,
    createdBy: toStringId(post.createdBy),
    updatedBy: toStringId(post.updatedBy),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    publishedAt: publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
  };
}
