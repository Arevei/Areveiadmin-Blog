"use client";

import { Sparkles, Square } from "lucide-react";
import { useRef, useState } from "react";

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

  const set = <K extends keyof typeof brief>(key: K, value: (typeof brief)[K]) =>
    setBrief((current) => ({ ...current, [key]: value }));

  async function generate() {
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
        const data = (await response.json().catch(() => ({}))) as { error?: string };
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

      <div className="space-y-1.5">
        <label className="field-label" htmlFor="ai-topic">Topic</label>
        <textarea
          id="ai-topic"
          className="field-input min-h-20"
          value={brief.topic}
          onChange={(event) => set("topic", event.target.value)}
          placeholder="How small clinics can cut no-shows with WhatsApp reminders"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="field-label" htmlFor="ai-keyword">Primary keyword</label>
          <input id="ai-keyword" className="field-input" value={brief.primaryKeyword} onChange={(event) => set("primaryKeyword", event.target.value)} placeholder="reduce patient no-shows" />
        </div>
        <div className="space-y-1.5">
          <label className="field-label" htmlFor="ai-audience">Audience</label>
          <input id="ai-audience" className="field-input" value={brief.audience} onChange={(event) => set("audience", event.target.value)} placeholder="Clinic owners in India" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="field-label" htmlFor="ai-secondary">Secondary keywords</label>
        <input id="ai-secondary" className="field-input" value={brief.secondaryKeywords} onChange={(event) => set("secondaryKeywords", event.target.value)} placeholder="appointment reminders, whatsapp automation" />
      </div>

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

      <div className="space-y-1.5">
        <label className="field-label" htmlFor="ai-tone">Tone</label>
        <input id="ai-tone" className="field-input" value={brief.tone} onChange={(event) => set("tone", event.target.value)} />
      </div>

      <div className="space-y-1.5">
        <label className="field-label" htmlFor="ai-notes">Facts, sources and angles to use</label>
        <textarea
          id="ai-notes"
          className="field-input min-h-24"
          value={brief.notes}
          onChange={(event) => set("notes", event.target.value)}
          placeholder="Paste real numbers, client examples, links or an outline. The AI will not invent statistics, so anything specific must come from here."
        />
      </div>

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
        <button type="button" className="btn btn-primary w-full" disabled={brief.topic.trim().length < 8} onClick={generate}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Generate draft
        </button>
      )}

      {message ? (
        <p className={`text-sm leading-relaxed ${message.tone === "error" ? "text-danger" : "text-accent"}`} role="status">
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
