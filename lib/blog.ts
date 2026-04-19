import sanitizeHtml from "sanitize-html";

import type { BlogPostDocument } from "@/lib/models/blog-post";
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

export function serializePost(post: BlogPostDocument) {
  const publishedAt = post.publishedAt || post.updatedAt || post.createdAt;

  return {
    id: post._id.toString(),
    slug: post.slug,
    title: post.title,
    seoTitle: post.seoTitle || "",
    seoDescription: post.seoDescription || "",
    excerpt: post.excerpt,
    contentHtml: post.contentHtml,
    author: post.authorName,
    authorRole: post.authorRole,
    date: formatDate(publishedAt),
    publishedAt: publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    readTime: calculateReadTime(post.contentHtml),
    category: post.category,
    tags: post.tags,
    keyTakeaways: post.keyTakeaways,
    thumbnail: post.coverImageUrl,
    thumbnailAlt: post.coverImageAlt || post.title,
    status: post.status,
    editorMode: post.editorMode,
    createdBy: post.createdBy.toString(),
    updatedBy: post.updatedBy.toString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}
