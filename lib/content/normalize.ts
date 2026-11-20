import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import sanitizeHtml from "sanitize-html";

/**
 * The single content pipeline for Arevei blog articles.
 *
 * Everything that reaches a reader goes through `normalizeArticleHtml`:
 * posts on save, legacy posts on read, the admin live preview and AI drafts.
 * The output uses a small fixed vocabulary (plain semantic tags + a handful of
 * `av-*` classes) that `blog-article.css` on the public site styles. Because
 * presentation never travels inside the content, the admin preview and the
 * live site cannot drift apart.
 */

export type TocItem = { id: string; text: string; level: 2 | 3 };
export type FaqItem = { question: string; answer: string };

export type NormalizedArticle = {
  html: string;
  toc: TocItem[];
  faqs: FaqItem[];
  wordCount: number;
  readTimeMinutes: number;
};

/** Classes the public stylesheet knows how to render. Everything else is dropped. */
export const ARTICLE_CLASSES = new Set([
  "av-callout",
  "av-table-wrap",
  "av-steps",
  "av-checklist",
  "av-cta",
  "av-button",
  "av-image",
  "av-grid",
  "av-card",
  "av-quote",
  "av-lead",
  "av-align-center",
  "av-align-right",
]);

const CLASS_ALIASES: Record<string, string> = {
  "av-intro": "av-lead",
  "av-deck": "av-lead",
  "av-note": "av-callout",
  "av-tip": "av-callout",
};

const ALLOWED_TAGS = [
  "h2", "h3", "h4", "p", "br", "hr", "strong", "em", "u", "s", "code", "pre", "sub", "sup", "mark",
  "a", "ul", "ol", "li", "blockquote", "figure", "figcaption", "img", "aside", "div",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
  "details", "summary", "iframe", "video", "source",
];

const SITE_HOSTS = ["arevei.com", "www.arevei.com"];

function textOf($el: cheerio.Cheerio<AnyNode>) {
  return $el.text().replace(/\s+/g, " ").trim();
}

function slugifyHeading(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/&[a-z]+;/g, " ")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "section"
  );
}

function comparable(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isExternal(href: string) {
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    return !SITE_HOSTS.includes(new URL(href).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

export function normalizeArticleHtml(input: string, options: { title?: string } = {}): NormalizedArticle {
  const $ = cheerio.load(input || "", null, false);

  $("script, style, link, meta, title, noscript, form, input, button, select, textarea").remove();

  // 1. Inline styles never survive. Keep only the intent we can express with classes.
  $("[style]").each((_, node) => {
    const el = $(node);
    const style = (el.attr("style") || "").toLowerCase();
    const tag = (node as Element).tagName?.toLowerCase();

    if (/text-align\s*:\s*center/.test(style) && tag !== "div") el.addClass("av-align-center");
    if (/text-align\s*:\s*right/.test(style) && tag !== "div") el.addClass("av-align-right");

    // Legacy "designed" posts drew callout boxes with bordered, padded divs.
    if (tag === "div" && !el.attr("class") && /border/.test(style) && /(padding|background)/.test(style)) {
      if (el.find("table").length === 0) el.addClass("av-callout");
    }

    el.removeAttr("style");
  });

  // 2. Page chrome that the site template already renders.
  $("nav, header").remove();
  $("p").each((_, node) => {
    if (/^estimated reading time/i.test(textOf($(node)))) $(node).remove();
  });

  // 3. Flatten structural wrappers down to plain flow content.
  $("b").each((_, node) => { (node as Element).tagName = "strong"; });
  $("i").each((_, node) => { (node as Element).tagName = "em"; });
  $("h1").first().remove(); // the page template renders the title
  $("h1").each((_, node) => { (node as Element).tagName = "h2"; });
  $("h5, h6").each((_, node) => { (node as Element).tagName = "h4"; });

  $("[class]").each((_, node) => {
    const el = $(node);
    const kept = (el.attr("class") || "")
      .split(/\s+/)
      .map((name) => CLASS_ALIASES[name] || name)
      .filter((name) => ARTICLE_CLASSES.has(name));
    if (kept.length > 0) el.attr("class", Array.from(new Set(kept)).join(" "));
    else el.removeAttr("class");
  });

  let guard = 0;
  while (guard++ < 12) {
    const wrappers = $("article, section, main, footer, span, font, center, div:not([class])").filter(
      (_, node) => !$(node).attr("class") || (node as Element).tagName !== "div",
    );
    if (wrappers.length === 0) break;
    wrappers.each((_, node) => {
      const el = $(node);
      const tag = (node as Element).tagName;
      // A lead/callout class on a section moves onto an equivalent div/aside.
      if (tag !== "span" && tag !== "font" && el.hasClass("av-lead")) {
        el.children("p").first().addClass("av-lead");
      }
      if (tag !== "span" && tag !== "font" && el.hasClass("av-callout")) {
        (node as Element).tagName = "aside";
        el.attr("class", "av-callout");
        return;
      }
      el.replaceWith(el.contents());
    });
  }
  $("div.av-callout").each((_, node) => { (node as Element).tagName = "aside"; });

  // 3b. Repair loose text left at the top level. The previous sanitizer stripped
  // <details>/<summary>, so older posts have FAQ questions as bare text between
  // paragraphs. A short line ending in "?" becomes a sub-heading, anything else a paragraph.
  $.root()
    .contents()
    .each((_, node) => {
      if (node.type !== "text") return;
      const text = (node.data || "").replace(/\s+/g, " ").trim();
      if (!text) return;
      const tag = text.endsWith("?") && text.length <= 200 ? "h3" : "p";
      $(node).replaceWith($(`<${tag}></${tag}>`).text(text));
    });

  // 4. Drop a leading heading that repeats the post title.
  const title = comparable(options.title || "");
  const firstHeading = $("h2").first();
  if (firstHeading.length && firstHeading.prevAll("h2, h3, p, ul, ol, table").length === 0) {
    const heading = comparable(textOf(firstHeading));
    if (title && heading && (heading === title || title.includes(heading) || heading.includes(title))) {
      firstHeading.remove();
    }
  }

  // 5. Tables always scroll inside their own wrapper.
  $("table").each((_, node) => {
    const el = $(node);
    el.removeAttr("width").removeAttr("border").removeAttr("cellpadding").removeAttr("cellspacing");
    if (!el.parent().is("div.av-table-wrap")) el.wrap('<div class="av-table-wrap"></div>');
  });
  $("div.av-table-wrap").each((_, node) => {
    if ($(node).find("table").length === 0) $(node).replaceWith($(node).contents());
  });

  // 6. Images and links.
  $("img").each((_, node) => {
    const el = $(node);
    if (!el.attr("src")) return void el.remove();
    el.attr("loading", "lazy").attr("decoding", "async");
    if (!el.attr("alt")) el.attr("alt", "");
    const parent = el.parent();
    if (parent.is("p") && textOf(parent) === "" && parent.children().length === 1) {
      parent.replaceWith($('<figure class="av-image"></figure>').append(el.clone()));
    }
  });
  $("figure").each((_, node) => {
    if ($(node).find("img, video, iframe").length) $(node).addClass("av-image");
  });
  $("a").each((_, node) => {
    const el = $(node);
    const href = (el.attr("href") || "").trim();
    if (!href) return void el.replaceWith(el.contents());
    if (isExternal(href)) el.attr("target", "_blank").attr("rel", "noopener noreferrer");
    else el.removeAttr("target").removeAttr("rel");
  });

  // 7. Empty blocks and stray breaks.
  $("p, h2, h3, h4, li, blockquote").each((_, node) => {
    const el = $(node);
    if (textOf(el) === "" && el.find("img, iframe, video").length === 0) el.remove();
  });
  $.root().children("br").remove();
  $("ul, ol").each((_, node) => {
    if ($(node).children("li").length === 0) $(node).remove();
  });

  // 8. Heading ids + table of contents.
  const used = new Map<string, number>();
  const toc: TocItem[] = [];
  $("h2, h3").each((_, node) => {
    const el = $(node);
    const text = textOf(el);
    const base = slugifyHeading(text);
    const seen = used.get(base) || 0;
    used.set(base, seen + 1);
    const id = seen === 0 ? base : `${base}-${seen + 1}`;
    el.attr("id", id);
    toc.push({ id, text, level: (node as Element).tagName === "h2" ? 2 : 3 });
  });
  $("h4, p, li, td, th, div, aside, figure, table, ul, ol, blockquote").removeAttr("id");

  // 9. FAQ extraction (feeds FAQPage structured data).
  const faqs: FaqItem[] = [];
  $("h2").each((_, node) => {
    if (!/\b(faqs?|frequently asked|common questions)\b/i.test(textOf($(node)))) return;
    let cursor = $(node).next();
    let current: FaqItem | null = null;
    while (cursor.length && !cursor.is("h2")) {
      if (cursor.is("h3")) {
        if (current?.answer) faqs.push(current);
        current = { question: textOf(cursor), answer: "" };
      } else if (current) {
        current.answer = `${current.answer} ${textOf(cursor)}`.trim();
      }
      cursor = cursor.next();
    }
    if (current?.answer) faqs.push(current);
  });

  const html = sanitizeHtml($.html(), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      "*": ["class", "id"],
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "title", "loading"],
      video: ["src", "controls", "poster", "width", "height"],
      source: ["src", "type"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
      ol: ["start"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"], iframe: ["https"] },
    allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com", "www.loom.com"],
    allowProtocolRelative: false,
  })
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const wordCount = countWords(cheerio.load(html, null, false).root().text());

  return {
    html,
    toc,
    faqs: faqs.slice(0, 12),
    wordCount,
    readTimeMinutes: Math.max(1, Math.round(wordCount / 220)),
  };
}
