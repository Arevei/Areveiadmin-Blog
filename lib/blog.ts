import sanitizeHtml from "sanitize-html";

import type { BlogPost, BlogPostDocument } from "@/lib/models/blog-post";
import { formatDate } from "@/lib/utils";

const allowedTags = [
  ...sanitizeHtml.defaults.allowedTags,
  "img",
  "figure",
  "figcaption",
  "iframe",
  "section",
  "article",
  "video",
  "source",
  "span",
  "h1",
  "h2",
  "h3",
  "h4",
];

const allowedAttributes = {
  ...sanitizeHtml.defaults.allowedAttributes,
  "*": ["class", "id", "style"],
  a: ["href", "name", "target", "rel"],
  img: ["src", "alt", "title", "width", "height", "loading", "style"],
  iframe: [
    "src",
    "width",
    "height",
    "allow",
    "allowfullscreen",
    "frameborder",
    "title",
  ],
  source: ["src", "type"],
};

export function sanitizeBlogHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ["http", "https", "mailto", "tel", "data"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
      iframe: ["http", "https"],
    },
    // The admin supports a raw HTML mode for trusted internal authors.
    // Keep inline styles intact so custom-designed blog layouts render
    // the same after save while still stripping unsafe tags/attributes.
    parseStyleAttributes: false,
  });
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
  const minutes = Math.max(1, Math.ceil(words / 200));
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
    "contentHtml" | "keyTakeaways" | "editorMode" | "authorRole" | "seoTitle" | "seoDescription" | "status"
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

  return {
    ...serializePostCard(post),
    seoTitle: post.seoTitle || "",
    seoDescription: post.seoDescription || "",
    contentHtml: post.contentHtml,
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
