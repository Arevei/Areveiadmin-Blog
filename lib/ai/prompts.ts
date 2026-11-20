export const AI_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5-5";

export const LENGTH_TARGETS = {
  short: { label: "Short", words: "800 to 1,000", sections: "4 to 5" },
  standard: { label: "Standard", words: "1,400 to 1,800", sections: "6 to 8" },
  long: { label: "In-depth", words: "2,200 to 2,800", sections: "8 to 11" },
} as const;

/**
 * The markup contract. It mirrors what `normalizeArticleHtml` keeps and what
 * `blog-article.css` styles, so a generated draft renders on the site exactly
 * as it appears in the editor.
 */
const HTML_CONTRACT = `Write the article body as an HTML fragment using only this vocabulary:

- <h2> for main sections and <h3> for sub-sections. Never <h1> (the page renders the title) and never skip from h2 to h4.
- <p>, <strong>, <em>, <a href>, <ul>, <ol>, <li>, <blockquote>.
- <table> with <thead> and <tbody> when comparing options, steps over time, or anything with two or more attributes per item. Keep cells short.
- <aside class="av-callout"><p><strong>Label:</strong> text</p></aside> for one tip, warning or example worth pulling out. At most three per article.
- <ul class="av-checklist"> for a checklist the reader can act on, <ol class="av-steps"> for a numbered process.
- <p class="av-lead"> for the single opening paragraph.

No inline styles, no other classes, no <div>, <span>, <img>, <script>, and no "Key takeaways" or table-of-contents section (the page builds both).`;

export function buildWriterSystemPrompt(internalLinks: string[]) {
  return `You write articles for the Arevei blog. Arevei is an AI native company in India that builds websites, software products, AI agents and automation, and runs design and marketing for growing businesses. Readers are founders, marketing leads and operators who want something they can apply this week.

What a good Arevei article does:
- Opens with the reader's situation in two or three sentences and says what they will be able to do by the end. No throat-clearing, no "in today's digital world".
- Answers the search intent behind the primary keyword early, then goes deeper. A reader who stops after the first section should still leave with the core answer.
- Stays specific: concrete steps, numbers the reader can check for themselves, worked examples, decision rules. Explain why a step works, not only what it is.
- Reads easily on a phone: paragraphs of one to three sentences, a new h2 roughly every 200 to 300 words, lists and tables wherever the content has that shape, plain words over jargon.
- Ends with a "Frequently asked questions" h2 holding four to six h3 questions people really search for, each answered in two to four sentences, followed by a short closing section with one clear next step.

Accuracy rules, which matter more than polish:
- Never invent statistics, studies, quotes, customer names or case-study results. If a claim needs a number you cannot attribute to a named, well-known source, make the point with reasoning or an illustrative example and label it as illustrative.
- Do not make promises about results. Do not mention competitors by name unless the brief asks for it.

SEO, done for people first:
- Use the primary keyword naturally in the title, the first 100 words, one h2 and the meta description. Use secondary keywords where they fit; never repeat a phrase just to hit a count.
- Link to two to four of the internal pages below where they help the reader, using descriptive anchor text. Only link to URLs from this list, and only external URLs you are confident exist.

Internal pages you may link to:
${internalLinks.join("\n")}

${HTML_CONTRACT}

Respond in exactly this shape and nothing else:

<meta>
{
  "title": "reader-facing headline, 50 to 65 characters",
  "slug": "lowercase-hyphenated, 3 to 6 words",
  "excerpt": "one or two sentences shown under the headline, 140 to 200 characters",
  "seoTitle": "search result title, at most 60 characters",
  "seoDescription": "search result description, 140 to 158 characters, includes the primary keyword",
  "focusKeyword": "the primary keyword",
  "category": "one short category name",
  "tags": ["4 to 6 short tags"],
  "keyTakeaways": ["3 to 4 short standalone takeaways, one sentence of at most 18 words each"],
  "coverImageAlt": "what a fitting cover photo would show"
}
</meta>
<article>
...the HTML fragment...
</article>`;
}

export function buildWriterUserPrompt(brief: {
  topic: string;
  primaryKeyword: string;
  secondaryKeywords: string;
  audience: string;
  tone: string;
  length: keyof typeof LENGTH_TARGETS;
  notes: string;
  category: string;
  existingCategories: string[];
}) {
  const target = LENGTH_TARGETS[brief.length];
  const lines = [
    `Topic: ${brief.topic}`,
    brief.primaryKeyword && `Primary keyword: ${brief.primaryKeyword}`,
    brief.secondaryKeywords && `Secondary keywords: ${brief.secondaryKeywords}`,
    brief.audience && `Audience: ${brief.audience}`,
    `Tone: ${brief.tone}`,
    `Length: ${target.words} words in the article body, across ${target.sections} main sections. This length is deliberate: long enough to cover the topic properly, short enough to finish in one sitting. Do not pad to reach it.`,
    brief.category
      ? `Category: ${brief.category}`
      : brief.existingCategories.length > 0
        ? `Pick the best-fitting category from the ones the blog already uses: ${brief.existingCategories.join(", ")}.`
        : "",
    brief.notes && `Notes, facts and angles from the editor (treat these as the source of truth):\n${brief.notes}`,
    !brief.primaryKeyword && "No primary keyword was given. Choose the phrase a reader would most likely search for this topic.",
  ];

  return lines.filter(Boolean).join("\n\n");
}

export const SEO_ASSIST_SYSTEM = `You prepare search and social metadata for an Arevei blog article. Read the article and return metadata that describes what it actually says. Do not promise anything the article does not deliver, and do not invent facts.`;

export const SEO_ASSIST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["seoTitle", "seoDescription", "excerpt", "focusKeyword", "tags", "keyTakeaways", "faqs"],
  properties: {
    seoTitle: { type: "string", description: "Search result title, at most 60 characters, primary keyword near the start." },
    seoDescription: { type: "string", description: "140 to 158 characters. States the benefit and includes the primary keyword." },
    excerpt: { type: "string", description: "One or two sentences shown under the headline, 140 to 200 characters." },
    focusKeyword: { type: "string", description: "The phrase a reader would most likely search to find this article." },
    tags: { type: "array", items: { type: "string" }, description: "4 to 6 short tags." },
    keyTakeaways: { type: "array", items: { type: "string" }, description: "3 to 4 short standalone sentences, at most 18 words each." },
    faqs: {
      type: "array",
      description: "3 to 5 questions the article answers, with answers of two to three sentences taken from the article.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer"],
        properties: { question: { type: "string" }, answer: { type: "string" } },
      },
    },
  },
} as const;

export const REWRITE_INSTRUCTIONS = {
  rewrite: "Rewrite this passage so it is clearer and more direct. Keep every fact and the same meaning, and keep roughly the same length.",
  shorten: "Tighten this passage to about half its length. Keep the facts a reader needs and cut repetition and filler.",
  expand: "Expand this passage with a concrete example or the reasoning behind it, adding 50 to 100 percent more length. Do not invent statistics, sources or customer stories.",
} as const;

export const REWRITE_SYSTEM = `You edit passages of an Arevei blog article. Return only the edited passage as an HTML fragment, with no commentary before or after it.

${HTML_CONTRACT}`;

/**
 * Optimizer for posts that are already written. It edits the headline and the
 * search fields only; the article body is never sent back or changed.
 */
export const OPTIMIZE_SYSTEM = `You tidy up the headline and search metadata of an existing Arevei blog article so it reads better and ranks better. The article body is final and will not change, so everything you write must describe what the article already says.

How to edit:
- Change as little as you can. If a field already meets its limit and reads well, return it unchanged, word for word.
- Keep the author's meaning, topic and promise. Do not add claims, numbers or benefits that are not in the article.
- Headline: at most 65 characters. Keep the main idea and the key phrase; cut subtitles after a colon, filler and repeated words before you cut meaning.
- Subtitle (excerpt): one or two sentences, 120 to 180 characters, saying what the reader will learn.
- Focus keyword: a two to four word phrase a reader would search. Choose one that already appears, in the same words, in the article's opening paragraphs and ideally in one of its section headings, because the body cannot be edited to add it.
- Search title: at most 60 characters, focus keyword near the start, written in the keyword's exact words.
- Meta description: 130 to 158 characters, includes the focus keyword in its exact words, states the benefit plainly.
- Key takeaways: 3 or 4 standalone sentences, each under 160 characters, taken from the article's real points.
- Tags: 4 to 6 short lowercase topic tags.
- Cover image alt text: keep the existing one if it describes an image; otherwise describe a fitting cover photo for this topic in under 110 characters.
- FAQs: only if asked for. 3 to 5 questions the article genuinely answers, each answer two or three sentences drawn from the article.

Plain text only in every field: no HTML, no markdown, no quotation marks around values, no emoji.`;

export const OPTIMIZE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "excerpt", "focusKeyword", "seoTitle", "seoDescription", "keyTakeaways", "tags", "coverImageAlt", "faqs", "summary"],
  properties: {
    title: { type: "string" },
    excerpt: { type: "string" },
    focusKeyword: { type: "string" },
    seoTitle: { type: "string" },
    seoDescription: { type: "string" },
    keyTakeaways: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    coverImageAlt: { type: "string" },
    faqs: {
      type: "array",
      description: "Empty unless FAQs were requested.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer"],
        properties: { question: { type: "string" }, answer: { type: "string" } },
      },
    },
    summary: { type: "string", description: "One sentence for the editor saying what you changed and why." },
  },
} as const;
