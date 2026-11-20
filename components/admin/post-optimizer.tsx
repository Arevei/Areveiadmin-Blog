"use client";

import { CheckCircle2, Sparkles, Square, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type FlaggedPost = {
  id: string;
  title: string;
  status: string;
  issues: string[];
};

type Result =
  | { state: "running" }
  | { state: "error"; message: string }
  | { state: "done"; titleBefore: string; titleAfter: string; fixed: number; left: string[]; summary: string };

type OptimizeResponse = {
  error?: string;
  before?: { title: string };
  after?: { title: string };
  issuesBefore?: string[];
  issuesAfter?: string[];
  summary?: string;
};

/**
 * Finds posts whose headline or search fields break the limits and lets an
 * editor fix one, or all of them in sequence, with AI. Only the headline,
 * subtitle and SEO fields are rewritten; article bodies and URLs stay as they are.
 */
export function PostOptimizer({ posts }: { posts: FlaggedPost[] }) {
  const router = useRouter();
  const stopRef = useRef(false);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);

  const pending = posts.filter((post) => results[post.id]?.state !== "done");
  const doneCount = posts.length - pending.length;

  async function fix(post: FlaggedPost, rebuild: boolean) {
    setResults((current) => ({ ...current, [post.id]: { state: "running" } }));

    try {
      const response = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, apply: true, rebuild }),
      });
      const data = (await response.json()) as OptimizeResponse;
      if (!response.ok || !data.after) throw new Error(data.error || "Could not optimize this post.");

      const left = data.issuesAfter || [];
      setResults((current) => ({
        ...current,
        [post.id]: {
          state: "done",
          titleBefore: data.before?.title || post.title,
          titleAfter: data.after?.title || post.title,
          fixed: Math.max(0, (data.issuesBefore || []).length - left.length),
          left,
          summary: data.summary || "",
        },
      }));
      return true;
    } catch (error) {
      setResults((current) => ({
        ...current,
        [post.id]: { state: "error", message: error instanceof Error ? error.message : "Could not optimize this post." },
      }));
      return false;
    }
  }

  async function fixOne(post: FlaggedPost) {
    setRunning(true);
    await fix(post, true);
    setRunning(false);
    router.refresh();
  }

  async function fixAll() {
    const queue = pending;
    const live = queue.filter((post) => post.status === "PUBLISHED").length;
    const message = `Rewrite the headline, subtitle and SEO fields of ${queue.length} post${queue.length === 1 ? "" : "s"} with AI?${
      live > 0 ? ` ${live} of them ${live === 1 ? "is" : "are"} live, so the public site changes too.` : ""
    } Article text and URLs are not changed.`;
    if (!window.confirm(message)) return;

    stopRef.current = false;
    setRunning(true);
    setOpen(true);

    let failures = 0;
    for (let index = 0; index < queue.length; index += 1) {
      if (stopRef.current) break;
      const isLast = index === queue.length - 1;
      const ok = await fix(queue[index], isLast);
      failures = ok ? 0 : failures + 1;
      // Three failures in a row means the AI service or key is the problem, not the posts.
      if (failures >= 3) break;
    }

    setRunning(false);
    router.refresh();
  }

  if (posts.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.04] px-5 py-4 text-sm text-muted">
        <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />
        Every post passes the headline and SEO field checks.
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-accent/25 bg-accent/[0.04]" aria-label="AI optimizer">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">
            {pending.length} of {posts.length} flagged post{posts.length === 1 ? "" : "s"} still need fixing
          </p>
          <p className="mt-1 text-sm text-muted">
            Long headlines or subtitles, missing search titles, descriptions, keywords or takeaways. AI fixes these fields only;
            the article text and URL never change.
          </p>
        </div>

        <button type="button" className="btn btn-sm" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
          {open ? "Hide list" : "Review list"}
        </button>
        {running ? (
          <button type="button" className="btn btn-sm" onClick={() => { stopRef.current = true; }}>
            <Square className="h-3 w-3" aria-hidden="true" />
            Stop after this post
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" disabled={pending.length === 0} onClick={fixAll}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Fix {pending.length === posts.length ? "all" : "remaining"} {pending.length} with AI
          </button>
        )}
      </div>

      {running || doneCount > 0 ? (
        <div className="h-1 bg-white/[0.06]" role="progressbar" aria-valuemin={0} aria-valuemax={posts.length} aria-valuenow={doneCount} aria-label="Posts optimized">
          <div className="h-full bg-accent transition-[width]" style={{ width: `${(doneCount / posts.length) * 100}%` }} />
        </div>
      ) : null}

      {open ? (
        <ul className="thin-scroll max-h-[26rem] divide-y divide-line overflow-y-auto border-t border-line">
          {posts.map((post) => {
            const result = results[post.id];

            return (
              <li key={post.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/posts/${post.id}`} className="text-sm font-semibold text-foreground hover:text-accent">
                    {result?.state === "done" ? result.titleAfter : post.title}
                  </Link>

                  {result?.state === "done" ? (
                    <div className="mt-1 space-y-0.5 text-xs text-muted">
                      {result.titleAfter !== result.titleBefore ? <p>Was: {result.titleBefore}</p> : null}
                      {result.summary ? <p>{result.summary}</p> : null}
                      {result.left.length > 0 ? <p className="text-warn">Still open: {result.left.join(" · ")}</p> : null}
                    </div>
                  ) : result?.state === "error" ? (
                    <p className="mt-1 text-xs text-danger">{result.message}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted">{post.issues.join(" · ")}</p>
                  )}
                </div>

                {result?.state === "done" ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    {result.fixed} fixed
                  </span>
                ) : result?.state === "running" ? (
                  <span className="text-xs font-semibold text-accent" aria-live="polite">Working…</span>
                ) : (
                  <button type="button" className="btn btn-sm" disabled={running} onClick={() => fixOne(post)}>
                    {result?.state === "error" ? <XCircle className="h-3.5 w-3.5 text-danger" aria-hidden="true" /> : null}
                    {result?.state === "error" ? "Retry" : "Fix"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
