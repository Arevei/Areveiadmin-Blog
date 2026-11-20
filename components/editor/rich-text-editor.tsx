"use client";

import {
  Bold,
  Eraser,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Lightbulb,
  LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Sparkles,
  Table,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  /** Public site origin; the editor loads the site's article stylesheet from it. */
  siteUrl: string;
  title: string;
};

type AssistAction = "rewrite" | "shorten" | "expand";

const TOOLS = [
  { id: "p", label: "Paragraph", Icon: Pilcrow },
  { id: "h2", label: "Heading 2 (section)", Icon: Heading2 },
  { id: "h3", label: "Heading 3 (sub-section)", Icon: Heading3 },
  "divider",
  { id: "bold", label: "Bold", Icon: Bold },
  { id: "italic", label: "Italic", Icon: Italic },
  { id: "link", label: "Link", Icon: LinkIcon },
  "divider",
  { id: "ul", label: "Bulleted list", Icon: List },
  { id: "ol", label: "Numbered list", Icon: ListOrdered },
  { id: "checklist", label: "Checklist", Icon: ListChecks },
  { id: "quote", label: "Quote", Icon: Quote },
  { id: "callout", label: "Callout box", Icon: Lightbulb },
  { id: "table", label: "Table", Icon: Table },
  { id: "image", label: "Upload image", Icon: ImagePlus },
  { id: "hr", label: "Divider", Icon: Minus },
  "divider",
  { id: "undo", label: "Undo", Icon: Undo2 },
  { id: "redo", label: "Redo", Icon: Redo2 },
] as const;

type ToolId = Exclude<(typeof TOOLS)[number], string>["id"];

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function renderHtml(contentHtml: string) {
  const response = await fetch("/api/posts/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentHtml }),
  });
  if (!response.ok) throw new Error("Could not clean the content.");
  return ((await response.json()) as { contentHtml: string }).contentHtml;
}

function buildTable(rows: number, cols: number) {
  const head = Array.from({ length: cols }, (_, index) => `<th>Column ${index + 1}</th>`).join("");
  const body = Array.from({ length: rows }, () => `<tr>${"<td>&nbsp;</td>".repeat(cols)}</tr>`).join("");
  return `<div class="av-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div><p><br></p>`;
}

/**
 * WYSIWYG surface that is styled by the public site's own article stylesheet,
 * so what an author types already looks like the published page. Pasted and
 * AI-edited HTML is passed through the server normalizer before it lands.
 */
export function RichTextEditor({ value, onChange, siteUrl, title }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const lastEmittedRef = useRef(value);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only write into the DOM when the value changed from outside (load, AI draft, HTML tab).
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && value !== lastEmittedRef.current) {
      editor.innerHTML = value;
      lastEmittedRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = value;
    document.execCommand("defaultParagraphSeparator", false, "p");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.innerHTML === "<br>" ? "" : editor.innerHTML;
    lastEmittedRef.current = html;
    onChange(html);
  }, [onChange]);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) savedRangeRef.current = range.cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    editorRef.current?.focus();
    const range = savedRangeRef.current;
    if (!range) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, []);

  const run = useCallback(
    (command: string, commandValue?: string) => {
      restoreSelection();
      document.execCommand(command, false, commandValue);
      emit();
      saveSelection();
    },
    [emit, restoreSelection, saveSelection],
  );

  const insertHtml = useCallback((html: string) => run("insertHTML", html), [run]);

  async function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    event.preventDefault();
    saveSelection();

    if (!html) {
      const paragraphs = text.split(/\n{2,}/).map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`);
      insertHtml(paragraphs.length > 1 ? paragraphs.join("") : escapeHtml(text));
      return;
    }

    setBusy("Cleaning pasted content…");
    try {
      insertHtml(await renderHtml(html));
    } catch {
      insertHtml(escapeHtml(text));
    } finally {
      setBusy(null);
    }
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy("Uploading image…");
    setError(null);

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "arevei/blog/editor");
      const response = await fetch("/api/uploads/images", { method: "POST", body });
      const data = (await response.json()) as { link?: string; originalFilename?: string; error?: string };
      if (!response.ok || !data.link) throw new Error(data.error || "Upload failed");

      const alt = window.prompt("Describe the image (alt text)", (data.originalFilename || "").replace(/[-_]+/g, " ")) || "";
      insertHtml(
        `<figure class="av-image"><img src="${escapeHtml(data.link)}" alt="${escapeHtml(alt)}" loading="lazy"><figcaption>${escapeHtml(alt)}</figcaption></figure><p><br></p>`,
      );
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  function handleLink() {
    saveSelection();
    const url = window.prompt("Link URL (use /path for Arevei pages)");
    if (url?.trim()) run("createLink", url.trim());
  }

  function handleTable() {
    saveSelection();
    const answer = window.prompt("Table size as rows x columns", "3x3");
    const match = answer?.match(/^\s*(\d{1,2})\s*[x×*,]\s*(\d{1,2})\s*$/i);
    if (!match) return;
    insertHtml(buildTable(Math.min(20, Math.max(1, Number(match[1]))), Math.min(8, Math.max(1, Number(match[2])))));
  }

  async function handleCleanUp() {
    setBusy("Cleaning up formatting…");
    setError(null);
    try {
      const cleaned = await renderHtml(editorRef.current?.innerHTML || "");
      if (editorRef.current) editorRef.current.innerHTML = cleaned;
      emit();
    } catch (cleanError) {
      setError(cleanError instanceof Error ? cleanError.message : "Clean up failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleAssist(action: AssistAction) {
    saveSelection();
    const range = savedRangeRef.current;
    if (!range || range.collapsed) {
      setError("Select a passage first, then choose an AI action.");
      return;
    }

    const holder = document.createElement("div");
    holder.appendChild(range.cloneContents());

    setBusy("AI is editing the selection…");
    setError(null);

    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, title, selection: holder.innerHTML }),
      });
      const data = (await response.json()) as { html?: string; error?: string };
      if (!response.ok || !data.html) throw new Error(data.error || "AI edit failed");
      insertHtml(data.html);
    } catch (assistError) {
      setError(assistError instanceof Error ? assistError.message : "AI edit failed");
    } finally {
      setBusy(null);
    }
  }

  function handleTool(id: ToolId) {
    switch (id) {
      case "p": return run("formatBlock", "p");
      case "h2": return run("formatBlock", "h2");
      case "h3": return run("formatBlock", "h3");
      case "bold": return run("bold");
      case "italic": return run("italic");
      case "link": return handleLink();
      case "ul": return run("insertUnorderedList");
      case "ol": return run("insertOrderedList");
      case "checklist": return insertHtml('<ul class="av-checklist"><li>First item</li><li>Second item</li></ul><p><br></p>');
      case "quote": return run("formatBlock", "blockquote");
      case "callout": return insertHtml('<aside class="av-callout"><p><strong>Tip:</strong> Write the callout here.</p></aside><p><br></p>');
      case "table": return handleTable();
      case "image":
        saveSelection();
        return uploadInputRef.current?.click();
      case "hr": return insertHtml("<hr><p><br></p>");
      case "undo": return run("undo");
      case "redo": return run("redo");
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      {/* The same stylesheet the live article page uses. */}
      <link rel="stylesheet" href={`${siteUrl}/blog-article.css`} />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;1,400&display=swap" />
      <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-raised px-2 py-1.5">
        {TOOLS.map((tool, index) =>
          tool === "divider" ? (
            <span key={index} className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
          ) : (
            <button
              key={tool.label}
              type="button"
              className="tool-button"
              title={tool.label}
              aria-label={tool.label}
              disabled={Boolean(busy)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleTool(tool.id)}
            >
              <tool.Icon className="h-4 w-4" aria-hidden="true" />
            </button>
          ),
        )}

        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        {(["rewrite", "shorten", "expand"] as const).map((action) => (
          <button
            key={action}
            type="button"
            className="tool-button capitalize"
            title={`AI: ${action} the selected passage`}
            disabled={Boolean(busy)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => handleAssist(action)}
          >
            {action === "rewrite" ? <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            {action}
          </button>
        ))}
        <button
          type="button"
          className="tool-button ml-auto"
          title="Remove stray formatting so the article matches the site exactly"
          disabled={Boolean(busy)}
          onClick={handleCleanUp}
        >
          <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
          Clean up
        </button>
      </div>

      <div className="editor-surface thin-scroll max-h-[75vh] overflow-y-auto" onClick={() => editorRef.current?.focus()}>
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-label="Article body"
          contentEditable
          suppressContentEditableWarning
          spellCheck
          className="av-prose av-prose-inner min-h-[28rem] outline-none"
          onInput={emit}
          onPaste={handlePaste}
          onBlur={saveSelection}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
        />
      </div>

      <div className="flex min-h-9 flex-wrap items-center justify-between gap-3 border-t border-line bg-raised px-3 py-2 text-xs text-muted" aria-live="polite">
        <span>{busy || "Styled with the live site stylesheet. Pasted content is cleaned automatically."}</span>
        {error ? <span className="field-error">{error}</span> : null}
      </div>
    </div>
  );
}
