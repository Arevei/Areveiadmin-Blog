"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

type UploadedAsset = {
  link: string;
  originalFilename?: string;
};

const toolbarButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#14261d]/10 bg-white/80 text-[#10231c] transition hover:border-[#0f8b6d]/35 hover:text-[#0f8b6d] disabled:cursor-not-allowed disabled:opacity-50";

const toolbarGroupClass = "flex flex-wrap items-center gap-2";

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

function buildImageHtml(imageUrl: string, filename?: string) {
  const altText = escapeAttribute(guessAltText(filename));
  const src = escapeAttribute(imageUrl);

  return [
    '<figure style="margin:24px 0;">',
    `  <img src="${src}" alt="${altText}" loading="lazy" style="width:100%;border-radius:16px;display:block;">`,
    "</figure>",
    "<p><br></p>",
  ].join("");
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [mode, setMode] = useState<"design" | "html">("design");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const editor = editorRef.current;

    if (mode === "design" && editor && editor.innerHTML !== value) {
      editor.innerHTML = value || "";
    }
  }, [mode, value]);

  const selectionIsInsideEditor = useCallback((range: Range) => {
    const editor = editorRef.current;
    return Boolean(editor && editor.contains(range.commonAncestorContainer));
  }, []);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (selectionIsInsideEditor(range)) {
      savedRangeRef.current = range.cloneRange();
    }
  }, [selectionIsInsideEditor]);

  const restoreSelection = useCallback(() => {
    const range = savedRangeRef.current;

    if (!range) {
      editorRef.current?.focus();
      return;
    }

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, []);

  const normalizeEditorLinks = useCallback(() => {
    editorRef.current?.querySelectorAll("a").forEach((link) => {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });
  }, []);

  const syncFromEditor = useCallback(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    normalizeEditorLinks();
    onChange(editor.innerHTML);
  }, [normalizeEditorLinks, onChange]);

  const runCommand = useCallback(
    (command: string, commandValue?: string) => {
      setMode("design");

      requestAnimationFrame(() => {
        editorRef.current?.focus();
        restoreSelection();
        document.execCommand(command, false, commandValue);
        syncFromEditor();
        saveSelection();
      });
    },
    [restoreSelection, saveSelection, syncFromEditor],
  );

  async function uploadImage(file: File): Promise<UploadedAsset> {
    const body = new FormData();
    body.append("file", file);
    body.append("folder", "arevei/blog/editor");

    const response = await fetch("/api/uploads/images", {
      method: "POST",
      body,
    });

    const data = (await response.json()) as UploadedAsset & { error?: string };

    if (!response.ok) {
      throw new Error(data.error || "Upload failed");
    }

    return data;
  }

  function insertHtmlIntoSource(html: string) {
    const textarea = sourceRef.current;

    if (!textarea) {
      onChange(`${value}${html}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${value.slice(0, start)}${html}${value.slice(end)}`;

    onChange(nextValue);

    requestAnimationFrame(() => {
      const cursor = start + html.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  function insertImageHtml(html: string) {
    if (mode === "html") {
      insertHtmlIntoSource(html);
      return;
    }

    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("insertHTML", false, html);
    syncFromEditor();
    saveSelection();
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const asset = await uploadImage(file);
      insertImageHtml(buildImageHtml(asset.link, asset.originalFilename));
      event.target.value = "";
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleImageUrlInsert() {
    const imageUrl = window.prompt("Paste an image URL");

    if (!imageUrl?.trim()) {
      return;
    }

    insertImageHtml(buildImageHtml(imageUrl.trim()));
  }

  function handleLinkInsert() {
    const url = window.prompt("Paste the link URL");

    if (!url?.trim()) {
      return;
    }

    runCommand("createLink", url.trim());
  }

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-[#14261d]/12 bg-white/72">
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14261d]/10 bg-white/65 p-3">
        <div className={toolbarGroupClass}>
          <button
            type="button"
            className={toolbarButtonClass}
            title="Paragraph"
            onClick={() => runCommand("formatBlock", "p")}
          >
            <span className="text-xs font-bold">P</span>
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            title="Heading 2"
            onClick={() => runCommand("formatBlock", "h2")}
          >
            <Heading2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            title="Heading 3"
            onClick={() => runCommand("formatBlock", "h3")}
          >
            <Heading3 className="h-4 w-4" />
          </button>
        </div>

        <div className={toolbarGroupClass}>
          <button type="button" className={toolbarButtonClass} title="Bold" onClick={() => runCommand("bold")}>
            <Bold className="h-4 w-4" />
          </button>
          <button type="button" className={toolbarButtonClass} title="Italic" onClick={() => runCommand("italic")}>
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            title="Underline"
            onClick={() => runCommand("underline")}
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            title="Quote"
            onClick={() => runCommand("formatBlock", "blockquote")}
          >
            <Quote className="h-4 w-4" />
          </button>
        </div>

        <div className={toolbarGroupClass}>
          <button
            type="button"
            className={toolbarButtonClass}
            title="Bulleted list"
            onClick={() => runCommand("insertUnorderedList")}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            title="Numbered list"
            onClick={() => runCommand("insertOrderedList")}
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            title="Align left"
            onClick={() => runCommand("justifyLeft")}
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            title="Align center"
            onClick={() => runCommand("justifyCenter")}
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            title="Align right"
            onClick={() => runCommand("justifyRight")}
          >
            <AlignRight className="h-4 w-4" />
          </button>
        </div>

        <div className={toolbarGroupClass}>
          <button type="button" className={toolbarButtonClass} title="Insert link" onClick={handleLinkInsert}>
            <LinkIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            title="Upload image"
            disabled={uploading}
            onClick={() => {
              saveSelection();
              uploadInputRef.current?.click();
            }}
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <button type="button" className={toolbarButtonClass} title="Insert image URL" onClick={handleImageUrlInsert}>
            <span className="text-xs font-bold">URL</span>
          </button>
        </div>

        <div className={toolbarGroupClass}>
          <button type="button" className={toolbarButtonClass} title="Undo" onClick={() => runCommand("undo")}>
            <Undo2 className="h-4 w-4" />
          </button>
          <button type="button" className={toolbarButtonClass} title="Redo" onClick={() => runCommand("redo")}>
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={`${toolbarButtonClass} ${mode === "html" ? "border-[#0f8b6d]/50 text-[#0f8b6d]" : ""}`}
            title="Toggle HTML source"
            onClick={() => setMode((current) => (current === "design" ? "html" : "design"))}
          >
            <Code2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {mode === "html" ? (
        <textarea
          ref={sourceRef}
          className="min-h-[360px] w-full resize-y bg-white/90 p-5 font-mono text-sm leading-7 text-[#10231c] outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="<section><h2>Headline</h2><p>Write your HTML here...</p></section>"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="prose-preview min-h-[360px] bg-white/90 p-5 text-[#10231c] outline-none empty:before:text-[#9ba79f] empty:before:content-[attr(data-placeholder)]"
          data-placeholder="Design the full blog post here..."
          onInput={syncFromEditor}
          onBlur={saveSelection}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#14261d]/10 bg-white/65 px-4 py-3">
        <p className="text-xs text-[#647267]">
          {uploading ? "Uploading image..." : "Free design editor. Switch to HTML source anytime."}
        </p>
        {error ? <p className="field-error">{error}</p> : null}
      </div>
    </div>
  );
}
