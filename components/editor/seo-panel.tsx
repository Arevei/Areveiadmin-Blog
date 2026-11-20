"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import type { SeoCheck, SeoReport } from "@/lib/seo/analyze";

const STATUS = {
  good: { icon: CheckCircle2, className: "text-accent", label: "Passed" },
  warn: { icon: AlertTriangle, className: "text-warn", label: "Could improve" },
  bad: { icon: XCircle, className: "text-danger", label: "Needs fixing" },
} as const;

const GROUPS: SeoCheck["group"][] = ["Search appearance", "Keyword", "Content", "Readability"];

export function scoreTone(score: number) {
  return score >= 80 ? "text-accent" : score >= 55 ? "text-warn" : "text-danger";
}

type SeoPanelProps = {
  report: SeoReport;
  searchTitle: string;
  description: string;
  url: string;
};

export function SeoPanel({ report, searchTitle, description, url }: SeoPanelProps) {
  const order = { bad: 0, warn: 1, good: 2 };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className={`font-display text-5xl font-bold tabular-nums ${scoreTone(report.score)}`}>{report.score}</div>
        <div>
          <p className="text-sm font-semibold">SEO score</p>
          <p className="text-xs text-muted">
            {report.checks.filter((check) => check.status === "good").length} of {report.checks.length} checks passed ·{" "}
            {report.wordCount.toLocaleString("en-US")} words
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Search result preview</p>
        <div className="rounded-lg border border-line bg-white/[0.03] p-4">
          <p className="truncate text-xs text-muted">{url}</p>
          <p className="mt-1 line-clamp-1 text-lg leading-snug text-[#8ab4f8]">{searchTitle || "Add a title"} | Arevei Blog</p>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-[#bdc1c6]">{description || "Add a meta description."}</p>
        </div>
      </div>

      {GROUPS.map((group) => {
        const checks = report.checks.filter((check) => check.group === group).sort((a, b) => order[a.status] - order[b.status]);

        return (
          <section key={group}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{group}</h3>
            <ul className="space-y-2.5">
              {checks.map((check) => {
                const Icon = STATUS[check.status].icon;
                return (
                  <li key={check.id} className="flex gap-2.5">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${STATUS[check.status].className}`} aria-label={STATUS[check.status].label} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{check.label}</p>
                      <p className="text-xs leading-relaxed text-muted">{check.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
