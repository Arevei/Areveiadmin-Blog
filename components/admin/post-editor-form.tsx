"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CloudinaryUploadButton } from "@/components/admin/cloudinary-upload-button";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { slugify, splitCommaSeparated, splitLineSeparated } from "@/lib/utils";

type PostEditorFormProps = {
  mode: "create" | "edit";
  currentUser: {
    name: string;
    role: string;
  };
  initialPost?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    seoTitle: string;
    seoDescription: string;
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
};

type FormValues = {
  title: string;
  slug: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  category: string;
  tagsText: string;
  keyTakeawaysText: string;
  coverImageUrl: string;
  coverImageAlt: string;
  contentHtml: string;
  editorMode: "DESIGN" | "HTML";
  authorName: string;
  authorRole: string;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string;
};

export function PostEditorForm({ mode, currentUser, initialPost }: PostEditorFormProps) {
  const router = useRouter();
  const htmlEditorRef = useRef<HTMLTextAreaElement>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialPost?.slug));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [values, setValues] = useState<FormValues>({
    title: initialPost?.title || "",
    slug: initialPost?.slug || "",
    excerpt: initialPost?.excerpt || "",
    seoTitle: initialPost?.seoTitle || "",
    seoDescription: initialPost?.seoDescription || "",
    category: initialPost?.category || "",
    tagsText: initialPost?.tags.join(", ") || "",
    keyTakeawaysText: initialPost?.keyTakeaways.join("\n") || "",
    coverImageUrl: initialPost?.thumbnail || "",
    coverImageAlt: initialPost?.thumbnailAlt || "",
    contentHtml: initialPost?.contentHtml || "",
    editorMode: initialPost?.editorMode === "HTML" ? "HTML" : "DESIGN",
    authorName: initialPost?.author || currentUser.name,
    authorRole: initialPost?.authorRole || currentUser.role,
    status: initialPost?.status || "DRAFT",
    publishedAt: initialPost?.publishedAt ? initialPost.publishedAt.slice(0, 16) : "",
  });

  const previewMarkup = useMemo(
    () => ({ __html: values.contentHtml || "<p>Live preview will appear here.</p>" }),
    [values.contentHtml],
  );

  function updateField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleTitleChange(value: string) {
    setValues((current) => ({
      ...current,
      title: value,
      slug: slugTouched ? current.slug : slugify(value),
    }));
  }

  function guessAltText(filename?: string) {
    if (!filename) {
      return "Uploaded image";
    }

    return filename
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function insertHtmlImageAtCursor(imageUrl: string, filename?: string) {
    const textarea = htmlEditorRef.current;
    const altText = guessAltText(filename);
    const figureHtml = [
      "",
      "<figure style=\"margin:24px 0;\">",
      `  <img src="${imageUrl}" alt="${altText}" loading="lazy" style="width:100%;border-radius:16px;display:block;">`,
      "</figure>",
      "",
    ].join("\n");

    setValues((current) => {
      if (!textarea) {
        return {
          ...current,
          contentHtml: `${current.contentHtml}${figureHtml}`,
        };
      }

      const selectionStart = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;

      return {
        ...current,
        contentHtml:
          current.contentHtml.slice(0, selectionStart) +
          figureHtml +
          current.contentHtml.slice(selectionEnd),
      };
    });

    if (!textarea) {
      return;
    }

    requestAnimationFrame(() => {
      const cursor = textarea.selectionStart + figureHtml.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      title: values.title,
      slug: values.slug,
      excerpt: values.excerpt,
      seoTitle: values.seoTitle,
      seoDescription: values.seoDescription,
      category: values.category,
      tags: splitCommaSeparated(values.tagsText),
      keyTakeaways: splitLineSeparated(values.keyTakeawaysText),
      coverImageUrl: values.coverImageUrl,
      coverImageAlt: values.coverImageAlt,
      contentHtml: values.contentHtml,
      editorMode: values.editorMode,
      authorName: values.authorName,
      authorRole: values.authorRole,
      status: values.status,
      publishedAt: values.publishedAt ? new Date(values.publishedAt).toISOString() : null,
    };

    const response = await fetch(
      mode === "create" ? "/api/posts" : `/api/posts/${initialPost?.id}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Unable to save the post right now.");
      setSaving(false);
      return;
    }

    const nextId = data.post.id;
    router.push(`/dashboard/posts/${nextId}`);
    router.refresh();
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-[#14261d]/10 bg-white/60 p-3 shadow-[0_16px_40px_rgba(20,38,29,0.06)] sm:p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#647267]">
            Article preview
          </p>
          <p className="mt-1 text-sm text-[#10231c]">
            {previewOpen ? "Preview is open below." : "Preview is hidden while you edit."}
          </p>
        </div>
        <button
          type="button"
          aria-controls="post-live-preview"
          aria-expanded={previewOpen}
          onClick={() => setPreviewOpen((current) => !current)}
          className="inline-flex items-center justify-center rounded-full bg-[#10231c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f8b6d]"
        >
          {previewOpen ? "Hide preview" : "Show preview"}
        </button>
      </div>

      {previewOpen ? (
        <section id="post-live-preview" className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <div className="mb-4">
            <h2 className="font-display text-xl font-bold text-[#10231c]">Live preview</h2>
            <p className="mt-2 text-sm text-[#647267]">
              This preview renders your editor HTML. On save, unsafe tags are stripped, but inline
              styling for custom layouts is preserved.
            </p>
          </div>

          <div className="prose-preview max-h-[640px] overflow-y-auto rounded-[1.4rem] bg-white/82 p-5">
            <div dangerouslySetInnerHTML={previewMarkup} />
          </div>
        </section>
      ) : null}

      <div className="space-y-6">
        <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-[#10231c]">Core content</h2>
            <p className="mt-2 text-sm text-[#647267]">
              Write the post metadata, switch between the design editor and raw HTML, and shape the live
              article body.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="field-label" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                className="field-input"
                value={values.title}
                onChange={(event) => handleTitleChange(event.target.value)}
                placeholder="How to build a conversion-focused website"
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="field-label" htmlFor="slug">
                Slug
              </label>
              <input
                id="slug"
                className="field-input"
                value={values.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  updateField("slug", slugify(event.target.value));
                }}
                placeholder="conversion-focused-website-guide"
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="field-label" htmlFor="excerpt">
                Excerpt
              </label>
              <textarea
                id="excerpt"
                className="field-input min-h-28"
                value={values.excerpt}
                onChange={(event) => updateField("excerpt", event.target.value)}
                placeholder="A concise summary that appears on the public blog listing."
                required
              />
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor="category">
                Category
              </label>
              <input
                id="category"
                className="field-input"
                value={values.category}
                onChange={(event) => updateField("category", event.target.value)}
                placeholder="Website Development"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor="tags">
                Tags
              </label>
              <input
                id="tags"
                className="field-input"
                value={values.tagsText}
                onChange={(event) => updateField("tagsText", event.target.value)}
                placeholder="seo, lead generation, cro"
              />
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor="authorName">
                Author name
              </label>
              <input
                id="authorName"
                className="field-input"
                value={values.authorName}
                onChange={(event) => updateField("authorName", event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor="authorRole">
                Author role
              </label>
              <input
                id="authorRole"
                className="field-input"
                value={values.authorRole}
                onChange={(event) => updateField("authorRole", event.target.value)}
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="field-label" htmlFor="takeaways">
                Key takeaways
              </label>
              <textarea
                id="takeaways"
                className="field-input min-h-28"
                value={values.keyTakeawaysText}
                onChange={(event) => updateField("keyTakeawaysText", event.target.value)}
                placeholder="One takeaway per line"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between gap-4">
                <label className="field-label">Editor mode</label>
                <div className="rounded-full border border-[#14261d]/12 bg-white/70 p-1">
                  {(["DESIGN", "HTML"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateField("editorMode", option)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        values.editorMode === option
                          ? "bg-[#10231c] text-white"
                          : "text-[#647267] hover:text-[#10231c]"
                      }`}
                    >
                      {option === "DESIGN" ? "Design editor" : "Raw HTML"}
                    </button>
                  ))}
                </div>
              </div>

              {values.editorMode === "DESIGN" ? (
                <div className="space-y-3">
                  <RichTextEditor
                    value={values.contentHtml}
                    onChange={(content) => updateField("contentHtml", content)}
                  />
                  <p className="text-xs text-[#647267]">
                    Use the image button inside the design editor to upload and place images anywhere in the
                    article body.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-[#14261d]/10 bg-white/65 px-4 py-3">
                    <p className="text-xs text-[#647267]">
                      Upload an image to Cloudinary and insert a ready-to-edit figure block at the
                      cursor position.
                    </p>
                    <CloudinaryUploadButton
                      buttonLabel="Upload image for HTML"
                      folder="arevei/blog/editor"
                      onUploaded={(asset) => insertHtmlImageAtCursor(asset.link, asset.originalFilename)}
                    />
                  </div>
                  <textarea
                    ref={htmlEditorRef}
                    className="field-input min-h-[420px] font-mono text-sm"
                    value={values.contentHtml}
                    onChange={(event) => updateField("contentHtml", event.target.value)}
                    placeholder="<section><h2>Headline</h2><p>Write your HTML here...</p></section>"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <div className="mb-5">
            <h2 className="font-display text-2xl font-bold text-[#10231c]">SEO and media</h2>
            <p className="mt-2 text-sm text-[#647267]">
              These values are returned by the public API and used by the dynamic frontend.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="field-label" htmlFor="coverImageUrl">
                Cover image URL or path
              </label>
              <div className="space-y-3">
                <input
                  id="coverImageUrl"
                  className="field-input"
                  value={values.coverImageUrl}
                  onChange={(event) => updateField("coverImageUrl", event.target.value)}
                  placeholder="https://images.example.com/cover.jpg or /assets/blogs/cover.png"
                  required
                />
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-[#14261d]/10 bg-white/65 px-4 py-3">
                  <p className="text-xs text-[#647267]">
                    Upload a cover image directly to Cloudinary and fill this field automatically.
                  </p>
                  <CloudinaryUploadButton
                    buttonLabel="Upload cover image"
                    folder="arevei/blog/covers"
                    onUploaded={(asset) => {
                      updateField("coverImageUrl", asset.link);

                      if (!values.coverImageAlt.trim()) {
                        updateField("coverImageAlt", guessAltText(asset.originalFilename));
                      }
                    }}
                  />
                </div>
                {values.coverImageUrl ? (
                  <img
                    src={values.coverImageUrl}
                    alt={values.coverImageAlt || "Cover preview"}
                    className="h-40 w-full rounded-[1.2rem] object-cover"
                  />
                ) : null}
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="field-label" htmlFor="coverImageAlt">
                Cover image alt text
              </label>
              <input
                id="coverImageAlt"
                className="field-input"
                value={values.coverImageAlt}
                onChange={(event) => updateField("coverImageAlt", event.target.value)}
                placeholder="Descriptive alt text for accessibility"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="field-label" htmlFor="seoTitle">
                SEO title
              </label>
              <input
                id="seoTitle"
                className="field-input"
                value={values.seoTitle}
                onChange={(event) => updateField("seoTitle", event.target.value)}
                placeholder="Optional override for meta title"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="field-label" htmlFor="seoDescription">
                SEO description
              </label>
              <textarea
                id="seoDescription"
                className="field-input min-h-28"
                value={values.seoDescription}
                onChange={(event) => updateField("seoDescription", event.target.value)}
                placeholder="Optional meta description for search and social snippets"
              />
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                className="field-input"
                value={values.status}
                onChange={(event) =>
                  updateField("status", event.target.value as FormValues["status"])
                }
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor="publishedAt">
                Publish date
              </label>
              <input
                id="publishedAt"
                type="datetime-local"
                className="field-input"
                value={values.publishedAt}
                onChange={(event) => updateField("publishedAt", event.target.value)}
              />
            </div>
          </div>
        </section>
      </div>

      <section className="glass-panel rounded-[2rem] p-6">
        <h2 className="font-display text-xl font-bold text-[#10231c]">Publishing note</h2>
        <p className="mt-3 text-sm leading-7 text-[#647267]">
          Published posts appear immediately on the dynamic frontend after save. Draft posts stay
          private inside the admin panel.
        </p>

        {error ? <p className="mt-4 text-sm font-semibold text-[#c65d3d]">{error}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#10231c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f8b6d] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {saving
            ? "Saving..."
            : mode === "create"
              ? "Create post"
              : "Save changes"}
        </button>
      </section>
    </form>
  );
}
