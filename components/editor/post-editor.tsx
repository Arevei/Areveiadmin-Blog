"use client";

import { ExternalLink, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CloudinaryUploadButton } from "@/components/admin/cloudinary-upload-button";
import { AiPanel, type GeneratedPost } from "@/components/editor/ai-panel";
import { PreviewFrame } from "@/components/editor/preview-frame";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { SeoPanel, scoreTone } from "@/components/editor/seo-panel";
import { analyzeSeo } from "@/lib/seo/analyze";
import { slugify, splitCommaSeparated, splitLineSeparated } from "@/lib/utils";

type Faq = { question: string; answer: string };

export type EditorPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  noindex: boolean;
  faqs: Faq[];
  category: string;
  tags: string[];
  keyTakeaways: string[];
  thumbnail: string;
  thumbnailAlt: string;
  contentHtml: string;
  editorMode: "DESIGN" | "FROALA" | "HTML";
  author: string;
  authorRole: string;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string;
};

type PostEditorProps = {
  mode: "create" | "edit";
  currentUser: { name: string; role: string };
  initialPost?: EditorPost;
  siteUrl: string;
  site: Record<string, unknown>;
  categories: string[];
  startWithAi?: boolean;
};

type Rendered = {
  contentHtml: string;
  toc: { id: string; text: string; level: number }[];
  faqs: Faq[];
  wordCount: number;
  readTimeText: string;
};

type Tab = "preview" | "seo" | "ai";

const EMPTY_RENDER: Rendered = { contentHtml: "", toc: [], faqs: [], wordCount: 0, readTimeText: "1 min read" };

function toLocalInput(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function CharCount({ value, min, max }: { value: string; min: number; max: number }) {
  const length = value.trim().length;
  const tone = length === 0 ? "text-muted" : length >= min && length <= max ? "text-accent" : "text-warn";
  return <span className={`text-xs tabular-nums ${tone}`}>{length} / {max}</span>;
}

export function PostEditor({ mode, currentUser, initialPost, siteUrl, site, categories, startWithAi }: PostEditorProps) {
  const router = useRouter();
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const postId = initialPost?.id;
  const [slugTouched, setSlugTouched] = useState(Boolean(initialPost?.slug));
  const [tab, setTab] = useState<Tab>(startWithAi ? "ai" : "preview");
  const [saving, setSaving] = useState<"DRAFT" | "PUBLISHED" | null>(null);
  const [notice, setNotice] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [seoBusy, setSeoBusy] = useState(false);
  const [rendered, setRendered] = useState<Rendered>({ ...EMPTY_RENDER, contentHtml: initialPost?.contentHtml || "" });
  const [values, setValues] = useState({
    title: initialPost?.title || "",
    slug: initialPost?.slug || "",
    excerpt: initialPost?.excerpt || "",
    seoTitle: initialPost?.seoTitle || "",
    seoDescription: initialPost?.seoDescription || "",
    focusKeyword: initialPost?.focusKeyword || "",
    noindex: initialPost?.noindex || false,
    faqs: initialPost?.faqs || ([] as Faq[]),
    category: initialPost?.category || "",
    tagsText: initialPost?.tags.join(", ") || "",
    keyTakeawaysText: initialPost?.keyTakeaways.join("\n") || "",
    coverImageUrl: initialPost?.thumbnail || "",
    coverImageAlt: initialPost?.thumbnailAlt || "",
    contentHtml: initialPost?.contentHtml || "",
    editorMode: (initialPost?.editorMode === "HTML" ? "HTML" : "DESIGN") as "DESIGN" | "HTML",
    authorName: initialPost?.author || currentUser.name,
    authorRole: initialPost?.authorRole || currentUser.role,
    status: initialPost?.status || ("DRAFT" as "DRAFT" | "PUBLISHED"),
    publishedAt: toLocalInput(initialPost?.publishedAt || ""),
  });

  const update = useCallback(<K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }, []);

  const setContent = useCallback((html: string) => update("contentHtml", html), [update]);

  // The server decides what the stored/served HTML is. Ask it, debounced, and feed preview + SEO from the answer.
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/posts/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentHtml: values.contentHtml, title: values.title }),
          signal: controller.signal,
        });
        if (response.ok) setRendered((await response.json()) as Rendered);
      } catch {
        // Aborted by a newer keystroke, or offline; the next change retries.
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [values.contentHtml, values.title]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const tags = useMemo(() => splitCommaSeparated(values.tagsText), [values.tagsText]);
  const keyTakeaways = useMemo(() => splitLineSeparated(values.keyTakeawaysText), [values.keyTakeawaysText]);
  const manualFaqs = useMemo(
    () => values.faqs.filter((faq) => faq.question.trim().length >= 3 && faq.answer.trim().length >= 3),
    [values.faqs],
  );
  const effectiveFaqs = manualFaqs.length > 0 ? manualFaqs : rendered.faqs;

  const report = useMemo(
    () =>
      analyzeSeo({
        title: values.title,
        slug: values.slug,
        excerpt: values.excerpt,
        seoTitle: values.seoTitle,
        seoDescription: values.seoDescription,
        focusKeyword: values.focusKeyword,
        contentHtml: rendered.contentHtml,
        coverImageAlt: values.coverImageAlt,
        keyTakeaways,
        faqCount: effectiveFaqs.length,
      }),
    [values, rendered.contentHtml, keyTakeaways, effectiveFaqs.length],
  );

  const previewPost = useMemo(() => {
    const publishedAt = values.publishedAt ? new Date(values.publishedAt).toISOString() : new Date().toISOString();
    return {
      id: postId || "preview",
      slug: values.slug || "preview",
      title: values.title || "Your headline appears here",
      excerpt: values.excerpt,
      author: values.authorName,
      authorRole: values.authorRole,
      date: "",
      publishedAt,
      dateModified: publishedAt,
      readTime: rendered.readTimeText,
      category: values.category || "Category",
      tags,
      thumbnail: values.coverImageUrl,
      thumbnailAlt: values.coverImageAlt,
      contentHtml: rendered.contentHtml,
      toc: rendered.toc,
      faqs: effectiveFaqs,
      wordCount: rendered.wordCount,
      keyTakeaways,
    };
  }, [values, rendered, tags, keyTakeaways, effectiveFaqs, postId]);

  function applyGenerated(post: GeneratedPost) {
    setValues((current) => ({
      ...current,
      title: post.title,
      slug: mode === "edit" && current.status === "PUBLISHED" ? current.slug : post.slug,
      excerpt: post.excerpt,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      focusKeyword: post.focusKeyword,
      category: post.category || current.category,
      tagsText: post.tags.join(", "),
      keyTakeawaysText: post.keyTakeaways.join("\n"),
      coverImageAlt: current.coverImageAlt || post.coverImageAlt,
      contentHtml: post.contentHtml,
      faqs: [],
      editorMode: "DESIGN",
    }));
    setSlugTouched(true);
    setDirty(true);
    setTab("preview");
  }

  async function generateSeo() {
    setSeoBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "seo",
          title: values.title,
          focusKeyword: values.focusKeyword,
          contentHtml: rendered.contentHtml,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        seo?: { seoTitle: string; seoDescription: string; excerpt: string; focusKeyword: string; tags: string[]; keyTakeaways: string[]; faqs: Faq[] };
      };
      if (!response.ok || !data.seo) throw new Error(data.error || "Could not generate SEO fields.");

      const seo = data.seo;
      setValues((current) => ({
        ...current,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        focusKeyword: current.focusKeyword || seo.focusKeyword,
        excerpt: current.excerpt || seo.excerpt,
        tagsText: current.tagsText || seo.tags.join(", "),
        keyTakeawaysText: current.keyTakeawaysText || seo.keyTakeaways.join("\n"),
        faqs: current.faqs.length > 0 || rendered.faqs.length > 0 ? current.faqs : seo.faqs,
      }));
      setDirty(true);
      setTab("seo");
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not generate SEO fields." });
    } finally {
      setSeoBusy(false);
    }
  }

  const save = useCallback(
    async (status: "DRAFT" | "PUBLISHED") => {
      setSaving(status);
      setNotice(null);

      try {
        const response = await fetch(mode === "create" ? "/api/posts" : `/api/posts/${postId}`, {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: values.title,
            slug: values.slug,
            excerpt: values.excerpt,
            seoTitle: values.seoTitle,
            seoDescription: values.seoDescription,
            focusKeyword: values.focusKeyword,
            noindex: values.noindex,
            faqs: manualFaqs,
            category: values.category,
            tags,
            keyTakeaways,
            coverImageUrl: values.coverImageUrl,
            coverImageAlt: values.coverImageAlt,
            contentHtml: values.contentHtml,
            editorMode: values.editorMode,
            authorName: values.authorName,
            authorRole: values.authorRole,
            status,
            publishedAt: values.publishedAt ? new Date(values.publishedAt).toISOString() : null,
          }),
        });

        const data = (await response.json()) as { error?: string; post?: { id: string; contentHtml: string; publishedAt: string } };
        if (!response.ok || !data.post) throw new Error(data.error || "Unable to save the post right now.");

        const saved = data.post;
        setDirty(false);
        setValues((current) => ({
          ...current,
          status,
          contentHtml: saved.contentHtml,
          publishedAt: status === "PUBLISHED" ? toLocalInput(saved.publishedAt) : current.publishedAt,
        }));
        setNotice({ tone: "ok", text: status === "PUBLISHED" ? "Published. The live site updates within a minute." : "Draft saved." });

        if (mode === "create") router.replace(`/dashboard/posts/${saved.id}`);
        else router.refresh();
      } catch (error) {
        setNotice({ tone: "error", text: error instanceof Error ? error.message : "Unable to save the post right now." });
      } finally {
        setSaving(null);
      }
    },
    [values, tags, keyTakeaways, manualFaqs, mode, postId, router],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!saving) void save(values.status);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, saving, values.status]);

  const isLive = values.status === "PUBLISHED";
  const liveUrl = `${siteUrl}/blog/${values.slug}`;

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-background/95 px-4 py-2.5 backdrop-blur sm:-mx-8 sm:px-8">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isLive ? "bg-accent/15 text-accent" : "bg-white/10 text-muted"}`}>
          {isLive ? "Published" : "Draft"}
        </span>
        <span className="text-xs text-muted tabular-nums">
          {report.wordCount.toLocaleString("en-US")} words · {rendered.readTimeText}
        </span>
        <button type="button" className={`text-xs font-semibold tabular-nums ${scoreTone(report.score)}`} onClick={() => setTab("seo")}>
          SEO {report.score}/100
        </button>
        {dirty ? <span className="text-xs text-warn">Unsaved changes</span> : null}
        {notice ? (
          <span className={`text-xs ${notice.tone === "error" ? "text-danger" : "text-accent"}`} role="status">{notice.text}</span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {isLive && mode === "edit" ? (
            <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              View live
            </a>
          ) : null}
          <button type="button" className="btn btn-sm" disabled={Boolean(saving)} onClick={() => save("DRAFT")}>
            {saving === "DRAFT" ? "Saving…" : isLive ? "Unpublish to draft" : "Save draft"}
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={Boolean(saving)} onClick={() => save("PUBLISHED")}>
            {saving === "PUBLISHED" ? "Publishing…" : isLive ? "Update live post" : "Publish"}
          </button>
        </div>
      </div>

      <div className="grid gap-8 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]">
        <div className="min-w-0 space-y-8">
          <section className="space-y-4">
            <div className="space-y-1.5">
              <label className="field-label" htmlFor="title">Headline</label>
              <input
                id="title"
                className="field-input !py-3 font-display !text-2xl font-bold"
                value={values.title}
                onChange={(event) => {
                  const title = event.target.value;
                  setValues((current) => ({ ...current, title, slug: slugTouched ? current.slug : slugify(title) }));
                  setDirty(true);
                }}
                placeholder="How to build a conversion-focused website"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="field-label" htmlFor="excerpt">Subtitle / excerpt</label>
                <CharCount value={values.excerpt} min={120} max={200} />
              </div>
              <textarea
                id="excerpt"
                className="field-input min-h-20"
                value={values.excerpt}
                onChange={(event) => update("excerpt", event.target.value)}
                placeholder="One or two sentences shown under the headline and on blog cards."
              />
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Article</h2>
              <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Editor mode">
                {(["DESIGN", "HTML"] as const).map((option) => (
                  <button key={option} type="button" className="tool-button !h-7" aria-pressed={values.editorMode === option} onClick={() => update("editorMode", option)}>
                    {option === "DESIGN" ? "Write" : "HTML"}
                  </button>
                ))}
              </div>
            </div>

            {values.editorMode === "DESIGN" ? (
              <RichTextEditor value={values.contentHtml} onChange={setContent} siteUrl={siteUrl} title={values.title} />
            ) : (
              <div className="space-y-2">
                <textarea
                  ref={htmlRef}
                  className="field-input thin-scroll min-h-[32rem] font-mono !text-[13px] leading-relaxed"
                  value={values.contentHtml}
                  onChange={(event) => update("contentHtml", event.target.value)}
                  spellCheck={false}
                  placeholder="<h2>Section</h2><p>Paste or write HTML here…</p>"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="field-hint max-w-xl">
                    Inline styles, custom classes and &lt;style&gt; blocks are removed on save so every article shares one design. The preview shows the result.
                  </p>
                  <CloudinaryUploadButton
                    buttonLabel="Upload image"
                    folder="arevei/blog/editor"
                    className="btn btn-sm"
                    onUploaded={(asset) => {
                      const figure = `\n<figure class="av-image"><img src="${asset.link}" alt="" loading="lazy"></figure>\n`;
                      const at = htmlRef.current?.selectionStart ?? values.contentHtml.length;
                      update("contentHtml", values.contentHtml.slice(0, at) + figure + values.contentHtml.slice(at));
                    }}
                  />
                </div>
              </div>
            )}
          </section>

          <section className="glass-panel space-y-4 rounded-xl p-5">
            <h2 className="text-sm font-semibold">Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="field-label" htmlFor="category">Category</label>
                <input id="category" list="category-options" className="field-input" value={values.category} onChange={(event) => update("category", event.target.value)} placeholder="Website Growth" />
                <datalist id="category-options">
                  {categories.map((category) => <option key={category} value={category} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <label className="field-label" htmlFor="tags">Tags (comma separated)</label>
                <input id="tags" className="field-input" value={values.tagsText} onChange={(event) => update("tagsText", event.target.value)} placeholder="seo, lead generation, cro" />
              </div>
              <div className="space-y-1.5">
                <label className="field-label" htmlFor="authorName">Author</label>
                <input id="authorName" className="field-input" value={values.authorName} onChange={(event) => update("authorName", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="field-label" htmlFor="authorRole">Author role</label>
                <input id="authorRole" className="field-input" value={values.authorRole} onChange={(event) => update("authorRole", event.target.value)} placeholder="Growth Lead" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="field-label" htmlFor="takeaways">Key takeaways (one short line each; the first 4 show at the top of the article)</label>
                <textarea id="takeaways" className="field-input min-h-28" value={values.keyTakeawaysText} onChange={(event) => update("keyTakeawaysText", event.target.value)} />
              </div>
            </div>
          </section>

          <section className="glass-panel space-y-4 rounded-xl p-5">
            <h2 className="text-sm font-semibold">Cover image</h2>
            <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="field-label" htmlFor="coverImageUrl">Image URL</label>
                  <input id="coverImageUrl" className="field-input" value={values.coverImageUrl} onChange={(event) => update("coverImageUrl", event.target.value)} placeholder="https://…" />
                </div>
                <div className="space-y-1.5">
                  <label className="field-label" htmlFor="coverImageAlt">Alt text</label>
                  <input id="coverImageAlt" className="field-input" value={values.coverImageAlt} onChange={(event) => update("coverImageAlt", event.target.value)} placeholder="What the image shows" />
                </div>
                <CloudinaryUploadButton
                  buttonLabel="Upload cover (16:8, 1600px wide or more)"
                  folder="arevei/blog/covers"
                  className="btn btn-sm"
                  onUploaded={(asset) => update("coverImageUrl", asset.link)}
                />
              </div>
              <div className="aspect-[16/8] self-start overflow-hidden rounded-lg border border-line bg-white/[0.03]">
                {values.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={values.coverImageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">No cover yet</div>
                )}
              </div>
            </div>
          </section>

          <section className="glass-panel space-y-4 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Search and social</h2>
              <button type="button" className="btn btn-sm" disabled={seoBusy} onClick={generateSeo}>
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {seoBusy ? "Reading the article…" : "Generate with AI"}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="field-label" htmlFor="focusKeyword">Focus keyword</label>
                <input id="focusKeyword" className="field-input" value={values.focusKeyword} onChange={(event) => update("focusKeyword", event.target.value)} placeholder="lead response time" />
              </div>
              <div className="space-y-1.5">
                <label className="field-label" htmlFor="slug">URL slug</label>
                <input
                  id="slug"
                  className="field-input"
                  value={values.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    update("slug", slugify(event.target.value));
                  }}
                />
                {isLive && mode === "edit" ? <p className="field-hint">This post is live. Changing the slug breaks existing links.</p> : null}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="field-label" htmlFor="seoTitle">Search title</label>
                  <CharCount value={values.seoTitle || values.title} min={40} max={60} />
                </div>
                <input id="seoTitle" className="field-input" value={values.seoTitle} onChange={(event) => update("seoTitle", event.target.value)} placeholder={values.title || "Defaults to the headline"} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="field-label" htmlFor="seoDescription">Meta description</label>
                  <CharCount value={values.seoDescription} min={130} max={160} />
                </div>
                <textarea id="seoDescription" className="field-input min-h-20" value={values.seoDescription} onChange={(event) => update("seoDescription", event.target.value)} placeholder="Defaults to the excerpt" />
              </div>
              <div className="space-y-1.5">
                <label className="field-label" htmlFor="publishedAt">Publish date</label>
                <input id="publishedAt" type="datetime-local" className="field-input" value={values.publishedAt} onChange={(event) => update("publishedAt", event.target.value)} />
              </div>
              <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-[#00e6c4]" checked={values.noindex} onChange={(event) => update("noindex", event.target.checked)} />
                Hide from search engines (noindex)
              </label>
            </div>

            <div className="border-t border-line pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">FAQ structured data</h3>
                  <p className="field-hint mt-0.5">
                    {manualFaqs.length > 0
                      ? `${manualFaqs.length} question${manualFaqs.length === 1 ? "" : "s"} entered here.`
                      : rendered.faqs.length > 0
                        ? `${rendered.faqs.length} questions picked up automatically from the article's FAQ section.`
                        : "Add a “Frequently asked questions” section with H3 questions in the article, or enter questions here."}
                  </p>
                </div>
                <button type="button" className="btn btn-sm" onClick={() => update("faqs", [...values.faqs, { question: "", answer: "" }])}>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {values.faqs.map((faq, index) => (
                  <div key={index} className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <input
                        className="field-input"
                        aria-label={`Question ${index + 1}`}
                        placeholder="Question"
                        value={faq.question}
                        onChange={(event) => update("faqs", values.faqs.map((item, i) => (i === index ? { ...item, question: event.target.value } : item)))}
                      />
                      <textarea
                        className="field-input min-h-16"
                        aria-label={`Answer ${index + 1}`}
                        placeholder="Answer in two or three sentences"
                        value={faq.answer}
                        onChange={(event) => update("faqs", values.faqs.map((item, i) => (i === index ? { ...item, answer: event.target.value } : item)))}
                      />
                    </div>
                    <button type="button" className="tool-button self-start" aria-label={`Remove question ${index + 1}`} onClick={() => update("faqs", values.faqs.filter((_, i) => i !== index))}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="min-w-0 2xl:sticky 2xl:top-[72px] 2xl:h-[calc(100vh-96px)]">
          <div className="flex h-[80vh] flex-col 2xl:h-full">
            <div className="mb-3 flex gap-1 rounded-lg border border-line p-1" role="tablist" aria-label="Editor tools">
              {(["preview", "seo", "ai"] as const).map((key) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} className="tool-button flex-1" onClick={() => setTab(key)}>
                  {key === "preview" ? "Live preview" : key === "seo" ? `SEO ${report.score}` : "AI writer"}
                </button>
              ))}
            </div>

            {/* The preview stays mounted so the site iframe does not reload on every tab switch. */}
            <div className={tab === "preview" ? "min-h-0 flex-1" : "hidden"}>
              <PreviewFrame siteUrl={siteUrl} post={previewPost} site={site} />
            </div>
            {tab === "seo" ? (
              <div className="glass-panel thin-scroll min-h-0 flex-1 overflow-y-auto rounded-xl p-5">
                <SeoPanel report={report} searchTitle={values.seoTitle || values.title} description={values.seoDescription || values.excerpt} url={liveUrl} />
              </div>
            ) : null}
            {tab === "ai" ? (
              <div className="glass-panel thin-scroll min-h-0 flex-1 overflow-y-auto rounded-xl p-5">
                <AiPanel hasContent={rendered.wordCount > 30} defaultKeyword={values.focusKeyword} onGenerated={applyGenerated} />
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
