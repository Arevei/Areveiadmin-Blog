/**
 * Quick checks on a post's headline and search fields. Unlike the full SEO
 * report in the editor this needs no DOM, so the posts list (server) and the
 * AI optimizer use it to decide which posts need attention.
 */

export const META_LIMITS = {
  titleMax: 65,
  excerptMin: 100,
  excerptMax: 180,
  seoTitleMax: 60,
  seoDescriptionMin: 120,
  seoDescriptionMax: 160,
  takeawaysMin: 3,
  takeawayMax: 170,
  tagsMin: 3,
} as const;

export type PostMeta = {
  title: string;
  excerpt: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
  keyTakeaways: string[];
  tags: string[];
  coverImageAlt?: string;
};

export function findMetaIssues(post: PostMeta): string[] {
  const issues: string[] = [];
  const title = post.title.trim();
  const excerpt = post.excerpt.trim();
  const seoTitle = (post.seoTitle || "").trim();
  const seoDescription = (post.seoDescription || "").trim();
  const keyword = (post.focusKeyword || "").trim().toLowerCase();

  if (title.length > META_LIMITS.titleMax) issues.push(`Headline is ${title.length} characters (keep it under ${META_LIMITS.titleMax})`);
  if (excerpt.length > META_LIMITS.excerptMax) issues.push(`Subtitle is ${excerpt.length} characters (keep it under ${META_LIMITS.excerptMax})`);
  else if (excerpt.length < META_LIMITS.excerptMin) issues.push("Subtitle is too short");

  if (!seoTitle) issues.push("No search title");
  else if (seoTitle.length > META_LIMITS.seoTitleMax) issues.push(`Search title is ${seoTitle.length} characters (max ${META_LIMITS.seoTitleMax})`);

  if (!seoDescription) issues.push("No meta description");
  else if (seoDescription.length < META_LIMITS.seoDescriptionMin || seoDescription.length > META_LIMITS.seoDescriptionMax) {
    issues.push(`Meta description is ${seoDescription.length} characters (aim for ${META_LIMITS.seoDescriptionMin}–${META_LIMITS.seoDescriptionMax})`);
  }

  if (!keyword) issues.push("No focus keyword");
  else {
    if (!(seoTitle || title).toLowerCase().includes(keyword)) issues.push("Focus keyword missing from the search title");
    if (seoDescription && !seoDescription.toLowerCase().includes(keyword)) issues.push("Focus keyword missing from the meta description");
  }

  if (post.keyTakeaways.length < META_LIMITS.takeawaysMin) issues.push("Fewer than 3 key takeaways");
  else if (post.keyTakeaways.some((item) => item.length > META_LIMITS.takeawayMax)) issues.push("Key takeaways are too long");

  if (post.tags.length < META_LIMITS.tagsMin) issues.push("Fewer than 3 tags");
  if (!(post.coverImageAlt || "").trim()) issues.push("Cover image has no alt text");

  return issues;
}
