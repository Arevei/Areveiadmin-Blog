/**
 * On-page SEO and readability checks for the editor. Pure and synchronous, so
 * it runs on every keystroke in the browser against the normalized HTML (the
 * same HTML the site will serve).
 */

export type SeoStatus = "good" | "warn" | "bad";

export type SeoCheck = {
  id: string;
  group: "Search appearance" | "Keyword" | "Content" | "Readability";
  label: string;
  status: SeoStatus;
  detail: string;
};

export type SeoInput = {
  title: string;
  slug: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  contentHtml: string;
  coverImageAlt: string;
  keyTakeaways: string[];
  faqCount: number;
};

export type SeoReport = {
  score: number;
  wordCount: number;
  checks: SeoCheck[];
};

const SITE_HOSTS = ["arevei.com", "www.arevei.com"];

function norm(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function words(text: string) {
  return text.split(/\s+/).filter(Boolean);
}

function range(value: number, goodMin: number, goodMax: number, okMin: number, okMax: number): SeoStatus {
  if (value >= goodMin && value <= goodMax) return "good";
  if (value >= okMin && value <= okMax) return "warn";
  return "bad";
}

export function analyzeSeo(input: SeoInput): SeoReport {
  const doc = new DOMParser().parseFromString(input.contentHtml || "", "text/html");
  const bodyText = doc.body.textContent || "";
  const wordCount = words(bodyText).length;
  const keyword = norm(input.focusKeyword);
  const hasKeyword = keyword.length > 0;
  const contains = (text: string) => hasKeyword && norm(text).includes(keyword);

  const h2s = Array.from(doc.querySelectorAll("h2"));
  const paragraphs = Array.from(doc.querySelectorAll("p")).map((p) => p.textContent || "");
  const links = Array.from(doc.querySelectorAll("a[href]")).map((a) => a.getAttribute("href") || "");
  const internalLinks = links.filter((href) => {
    if (href.startsWith("/")) return true;
    try {
      return SITE_HOSTS.includes(new URL(href).hostname);
    } catch {
      return false;
    }
  });
  const externalLinks = links.filter((href) => /^https?:/i.test(href) && !internalLinks.includes(href));
  const images = Array.from(doc.querySelectorAll("img"));
  const imagesMissingAlt = images.filter((img) => !(img.getAttribute("alt") || "").trim()).length;

  const searchTitle = (input.seoTitle || input.title).trim();
  const description = (input.seoDescription || input.excerpt).trim();
  const firstWords = words(bodyText).slice(0, 120).join(" ");
  const keywordHits = hasKeyword ? norm(bodyText).split(keyword).length - 1 : 0;
  const density = wordCount > 0 ? (keywordHits * words(keyword).length * 100) / wordCount : 0;

  const sentences = bodyText.split(/[.!?]+\s/).filter((sentence) => words(sentence).length > 2);
  const avgSentence = sentences.length ? wordCount / sentences.length : 0;
  const longParagraphs = paragraphs.filter((text) => words(text).length > 90).length;
  const wordsPerH2 = h2s.length ? wordCount / h2s.length : wordCount;

  const checks: SeoCheck[] = [
    {
      id: "title-length",
      group: "Search appearance",
      label: "Search title length",
      status: range(searchTitle.length, 40, 60, 25, 68),
      detail: `${searchTitle.length} characters. Aim for 40 to 60 so it is not cut off in results.`,
    },
    {
      id: "description-length",
      group: "Search appearance",
      label: "Meta description length",
      status: input.seoDescription.trim()
        ? range(description.length, 130, 160, 100, 175)
        : "warn",
      detail: input.seoDescription.trim()
        ? `${description.length} characters. Aim for 130 to 160.`
        : "No meta description set, so the excerpt is used. Write one for better click-through.",
    },
    {
      id: "slug",
      group: "Search appearance",
      label: "Short, readable URL",
      status: input.slug.length === 0 ? "bad" : input.slug.split("-").length <= 7 && input.slug.length <= 60 ? "good" : "warn",
      detail: `/blog/${input.slug || "…"}. Keep it under about 60 characters and 7 words.`,
    },
    {
      id: "cover-alt",
      group: "Search appearance",
      label: "Cover image alt text",
      status: input.coverImageAlt.trim().length >= 8 ? "good" : "warn",
      detail: "Describe the cover image for screen readers and image search.",
    },
    {
      id: "keyword-set",
      group: "Keyword",
      label: "Focus keyword chosen",
      status: hasKeyword ? "good" : "bad",
      detail: hasKeyword ? `Checking against "${input.focusKeyword.trim()}".` : "Set the phrase you want this article to rank for.",
    },
    {
      id: "keyword-title",
      group: "Keyword",
      label: "Keyword in the search title",
      status: !hasKeyword ? "bad" : contains(searchTitle) ? "good" : "warn",
      detail: "Put the keyword near the start of the title.",
    },
    {
      id: "keyword-description",
      group: "Keyword",
      label: "Keyword in the meta description",
      status: !hasKeyword ? "bad" : contains(description) ? "good" : "warn",
      detail: "Search engines bold the matching phrase in the snippet.",
    },
    {
      id: "keyword-intro",
      group: "Keyword",
      label: "Keyword in the first 100 words",
      status: !hasKeyword ? "bad" : contains(firstWords) ? "good" : "warn",
      detail: "Confirm the topic early for readers and crawlers.",
    },
    {
      id: "keyword-heading",
      group: "Keyword",
      label: "Keyword in a section heading",
      status: !hasKeyword ? "bad" : h2s.some((h) => contains(h.textContent || "")) ? "good" : "warn",
      detail: "Use it in at least one H2, where it reads naturally.",
    },
    {
      id: "keyword-density",
      group: "Keyword",
      label: "Keyword used naturally",
      status: !hasKeyword ? "bad" : density > 2.5 ? "bad" : keywordHits >= 2 ? "good" : "warn",
      detail: hasKeyword
        ? `Used ${keywordHits} time${keywordHits === 1 ? "" : "s"} (${density.toFixed(1)}% of the text). Above 2.5% reads as stuffing.`
        : "Set a focus keyword to check this.",
    },
    {
      id: "length",
      group: "Content",
      label: "Article length",
      status: wordCount >= 1100 && wordCount <= 3000 ? "good" : wordCount >= 700 && wordCount <= 4000 ? "warn" : "bad",
      detail: `${wordCount.toLocaleString("en-US")} words. 1,100 to 3,000 covers most topics without losing readers.`,
    },
    {
      id: "headings",
      group: "Content",
      label: "Section headings",
      status: h2s.length >= 3 ? "good" : h2s.length >= 1 ? "warn" : "bad",
      detail: `${h2s.length} H2 section${h2s.length === 1 ? "" : "s"}. Use at least 3 so the table of contents is useful.`,
    },
    {
      id: "internal-links",
      group: "Content",
      label: "Internal links",
      status: internalLinks.length >= 2 ? "good" : internalLinks.length === 1 ? "warn" : "bad",
      detail: `${internalLinks.length} link${internalLinks.length === 1 ? "" : "s"} to other Arevei pages. Add 2 to 4.`,
    },
    {
      id: "external-links",
      group: "Content",
      label: "Sources linked",
      status: externalLinks.length >= 1 ? "good" : "warn",
      detail: `${externalLinks.length} external link${externalLinks.length === 1 ? "" : "s"}. Cite a source for any statistic.`,
    },
    {
      id: "image-alt",
      group: "Content",
      label: "Image alt text",
      status: imagesMissingAlt === 0 ? "good" : "warn",
      detail: images.length === 0 ? "No images in the body." : `${imagesMissingAlt} of ${images.length} images have no alt text.`,
    },
    {
      id: "takeaways",
      group: "Content",
      label: "Key takeaways",
      status: input.keyTakeaways.length >= 3 ? "good" : "warn",
      detail: "3 to 4 short takeaways appear at the top of the article and help it get quoted.",
    },
    {
      id: "faq",
      group: "Content",
      label: "FAQ section",
      status: input.faqCount >= 3 ? "good" : "warn",
      detail: `${input.faqCount} question${input.faqCount === 1 ? "" : "s"} detected. A "Frequently asked questions" H2 with H3 questions becomes FAQ structured data.`,
    },
    {
      id: "paragraphs",
      group: "Readability",
      label: "Short paragraphs",
      status: longParagraphs === 0 ? "good" : longParagraphs <= 2 ? "warn" : "bad",
      detail: `${longParagraphs} paragraph${longParagraphs === 1 ? "" : "s"} over 90 words. Split them for mobile readers.`,
    },
    {
      id: "sentences",
      group: "Readability",
      label: "Sentence length",
      status: avgSentence === 0 ? "warn" : avgSentence <= 20 ? "good" : avgSentence <= 25 ? "warn" : "bad",
      detail: `Average ${avgSentence.toFixed(0)} words per sentence. Under 20 is easy to read.`,
    },
    {
      id: "section-length",
      group: "Readability",
      label: "Sections are scannable",
      status: wordsPerH2 <= 350 ? "good" : wordsPerH2 <= 500 ? "warn" : "bad",
      detail: `About ${Math.round(wordsPerH2)} words per H2 section. Add a heading every 200 to 350 words.`,
    },
  ];

  const points = checks.reduce((sum, check) => sum + (check.status === "good" ? 1 : check.status === "warn" ? 0.5 : 0), 0);

  return { score: Math.round((points / checks.length) * 100), wordCount, checks };
}
