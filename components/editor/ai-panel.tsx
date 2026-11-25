"use client";

import { Sparkles, Square } from "lucide-react";
import { useRef, useState } from "react";

import { BRIEF_LABELS, BRIEF_LIMITS, BRIEF_TOPIC_MIN, tooLongMessage, type BriefField } from "@/lib/ai/brief-limits";

export type GeneratedPost = {
  title: string;
  slug: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  category: string;
  tags: string[];
  keyTakeaways: string[];
  coverImageAlt: string;
  contentHtml: string;
  faqs: { question: string; answer: string }[];
  wordCount: number;
};

type AiPanelProps = {
  hasContent: boolean;
  defaultKeyword: string;
  onGenerated: (post: GeneratedPost) => void;
};

const LENGTHS = [
  { value: "short", label: "Short", hint: "800–1,000 words · 4 min" },
  { value: "standard", label: "Standard", hint: "1,400–1,800 words · 7 min" },
  { value: "long", label: "In-depth", hint: "2,200–2,800 words · 12 min" },
] as const;

type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; post: GeneratedPost; truncated?: boolean }
  | { type: "error"; message: string };

const BRIEF_FIELDS = Object.keys(BRIEF_LIMITS) as BriefField[];

type TextFieldProps = {
  field: BriefField;
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  multiline?: boolean;
  inputClassName?: string;
};

/** A brief field with a live character counter and an inline error under the field that failed. */
function TextField({ field, id, value, onChange, error, placeholder, multiline, inputClassName = "" }: TextFieldProps) {
  const max = BRIEF_LIMITS[field];
  const length = value.trim().length;
  const invalid = Boolean(error);
  const className = `field-input ${inputClassName} ${invalid ? "border-danger!" : ""}`;
  const shared = {
    id,
    className,
    value,
    placeholder,
    "aria-invalid": invalid,
    "aria-describedby": `${id}-count${invalid ? ` ${id}-error` : ""}`,
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="field-label" htmlFor={id}>{BRIEF_LABELS[field]}</label>
        <span id={`${id}-count`} className={`text-[11px] tabular-nums ${length > max ? "font-semibold text-danger" : "text-muted"}`}>
          {length.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
        </span>
      </div>
      {multiline ? (
        <textarea {...shared} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input {...shared} onChange={(event) => onChange(event.target.value)} />
      )}
      {invalid ? (
        <p id={`${id}-error`} className="text-xs leading-relaxed text-danger" role="alert">{error}</p>
      ) : null}
    </div>
  );
}

/** Brief form + streaming progress for drafting a whole article with Claude. */
export function AiPanel({ hasContent, defaultKeyword, onGenerated }: AiPanelProps) {
  const abortRef = useRef<AbortController | null>(null);
  const [brief, setBrief] = useState({
    topic: "",
    primaryKeyword: defaultKeyword,
    secondaryKeywords: "",
    audience: "",
    tone: "Practical and direct",
    length: "standard" as (typeof LENGTHS)[number]["value"],
    notes: "",
  });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ words: 0, tail: "" });
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  const [serverErrors, setServerErrors] = useState<Partial<Record<BriefField, string>>>({});

  const set = <K extends keyof typeof brief>(key: K, value: (typeof brief)[K]) => {
    setBrief((current) => ({ ...current, [key]: value }));
    setServerErrors((current) => (key in current ? { ...current, [key]: undefined } : current));
  };

  // Live checks: a field over its limit is flagged as you type, before anything is sent.
  const errors: Partial<Record<BriefField, string>> = {};
  for (const field of BRIEF_FIELDS) {
    const length = brief[field].trim().length;
    if (length > BRIEF_LIMITS[field]) errors[field] = tooLongMessage(field, length);
    else if (serverErrors[field]) errors[field] = serverErrors[field];
  }
  const invalidFields = BRIEF_FIELDS.filter((field) => errors[field]);
  const topicTooShort = brief.topic.trim().length < BRIEF_TOPIC_MIN;

  async function generate() {
    if (invalidFields.length) return;
    if (hasContent && !window.confirm("Replace the current article and its SEO fields with a new AI draft?")) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setMessage(null);
    setProgress({ words: 0, tail: "" });

    let raw = "";
    let finished = false;

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => ({}))) as { error?: string; fields?: Partial<Record<BriefField, string>> };
        const failed = BRIEF_FIELDS.filter((field) => data.fields?.[field]);
        if (failed.length) {
          setServerErrors(data.fields || {});
          throw new Error(`Fix the marked ${failed.length === 1 ? "field" : "fields"}: ${failed.map((field) => BRIEF_LABELS[field]).join(", ")}.`);
        }
        throw new Error(data.error || "Could not start the AI draft.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;

          if (event.type === "delta") {
            raw += event.text;
            const text = raw.replace(/<[^>]*>/g, " ");
            setProgress({ words: text.split(/\s+/).filter(Boolean).length, tail: text.slice(-220) });
          } else if (event.type === "done") {
            finished = true;
            onGenerated(event.post);
            setMessage({
              tone: "ok",
              text: event.truncated
                ? `Draft loaded (${event.post.wordCount.toLocaleString("en-US")} words), but it hit the length limit. Check the ending.`
                : `Draft loaded: ${event.post.wordCount.toLocaleString("en-US")} words. Review the facts, add a cover image, then publish.`,
            });
          } else {
            finished = true;
            setMessage({ tone: "error", text: event.message });
          }
        }
      }

      if (!finished) setMessage({ tone: "error", text: "The AI draft ended early. Try again." });
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessage({ tone: "error", text: error instanceof Error ? error.message : "AI draft failed." });
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">Draft an article with AI</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Give a brief. You get a full article in the site&apos;s format with title, SEO fields, takeaways and FAQs filled in.
        </p>
      </div>

      <TextField
        field="topic"
        id="ai-topic"
        multiline
        inputClassName="min-h-20"
        value={brief.topic}
        onChange={(value) => set("topic", value)}
        error={errors.topic}
        placeholder="How small clinics can cut no-shows with WhatsApp reminders"
      />

      <TextField
        field="primaryKeyword"
        id="ai-keyword"
        value={brief.primaryKeyword}
        onChange={(value) => set("primaryKeyword", value)}
        error={errors.primaryKeyword}
        placeholder="reduce patient no-shows"
      />

      <TextField
        field="audience"
        id="ai-audience"
        multiline
        inputClassName="min-h-16"
        value={brief.audience}
        onChange={(value) => set("audience", value)}
        error={errors.audience}
        placeholder="Clinic owners in India"
      />

      <TextField
        field="secondaryKeywords"
        id="ai-secondary"
        multiline
        inputClassName="min-h-16"
        value={brief.secondaryKeywords}
        onChange={(value) => set("secondaryKeywords", value)}
        error={errors.secondaryKeywords}
        placeholder="appointment reminders, whatsapp automation"
      />

      <fieldset>
        <legend className="field-label mb-1.5">Length</legend>
        <div className="grid grid-cols-3 gap-2">
          {LENGTHS.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-center transition ${
                brief.length === option.value ? "border-accent bg-accent/10" : "border-line hover:border-white/30"
              }`}
            >
              <input type="radio" name="ai-length" className="sr-only" checked={brief.length === option.value} onChange={() => set("length", option.value)} />
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="block text-[11px] leading-tight text-muted">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <TextField
        field="tone"
        id="ai-tone"
        multiline
        inputClassName="min-h-16"
        value={brief.tone}
        onChange={(value) => set("tone", value)}
        error={errors.tone}
      />

      <TextField
        field="notes"
        id="ai-notes"
        multiline
        inputClassName="min-h-24"
        value={brief.notes}
        onChange={(value) => set("notes", value)}
        error={errors.notes}
        placeholder="Paste real numbers, client examples, links or an outline. The AI will not invent statistics, so anything specific must come from here."
      />

      {running ? (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-3" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-accent">
              {progress.words === 0 ? "Planning the article…" : `Writing… ${progress.words.toLocaleString("en-US")} words`}
            </p>
            <button type="button" className="btn btn-sm" onClick={() => abortRef.current?.abort()}>
              <Square className="h-3 w-3" aria-hidden="true" />
              Stop
            </button>
          </div>
          {progress.tail ? <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted">…{progress.tail}</p> : null}
        </div>
      ) : (
        <button type="button" className="btn btn-primary w-full" disabled={topicTooShort || invalidFields.length > 0} onClick={generate}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Generate draft
        </button>
      )}

      {!running && invalidFields.length > 0 ? (
        <p className="text-sm leading-relaxed text-danger" role="status">
          Shorten the marked {invalidFields.length === 1 ? "field" : "fields"} to generate: {invalidFields.map((field) => BRIEF_LABELS[field]).join(", ")}.
        </p>
      ) : null}

      {message ? (
        <p className={`text-sm leading-relaxed ${message.tone === "error" ? "text-danger" : "text-accent"}`} role="status">
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
