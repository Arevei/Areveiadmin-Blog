"use client";

import { useState } from "react";

import { CloudinaryUploadButton } from "@/components/admin/cloudinary-upload-button";
import type { SiteSettings } from "@/lib/models/site-settings";

type TextKey = { [K in keyof SiteSettings]: SiteSettings[K] extends string ? K : never }[keyof SiteSettings];

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as { error?: string; settings?: SiteSettings };
      if (!response.ok || !data.settings) throw new Error(data.error || "Could not save settings.");
      setValues(data.settings);
      setNotice({ tone: "ok", text: "Saved. Article pages pick this up within a minute." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not save settings." });
    } finally {
      setSaving(false);
    }
  }

  const text = (key: TextKey, label: string, options: { placeholder?: string; area?: boolean; hint?: string } = {}) => (
    <div className="space-y-1.5">
      <label className="field-label" htmlFor={key}>{label}</label>
      {options.area ? (
        <textarea id={key} className="field-input min-h-24" value={values[key]} placeholder={options.placeholder} onChange={(event) => set(key, event.target.value)} />
      ) : (
        <input id={key} className="field-input" value={values[key]} placeholder={options.placeholder} onChange={(event) => set(key, event.target.value)} />
      )}
      {options.hint ? <p className="field-hint">{options.hint}</p> : null}
    </div>
  );

  const toggle = (key: "promoEnabled" | "adsenseEnabled", label: string) => (
    <label className="flex items-center gap-2.5 text-sm font-medium">
      <input type="checkbox" className="h-4 w-4 accent-[#00e6c4]" checked={values[key]} onChange={(event) => set(key, event.target.checked)} />
      {label}
    </label>
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <section className="glass-panel space-y-4 rounded-xl p-5">
        <div>
          <h2 className="font-semibold">About card</h2>
          <p className="field-hint mt-1">The first card in the right column of every article.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("aboutTitle", "Title")}
          {text("aboutImageUrl", "Image URL (optional)", { placeholder: "https://…" })}
        </div>
        {text("aboutText", "Text", { area: true })}
        <div className="grid gap-4 sm:grid-cols-2">
          {text("aboutCtaLabel", "Link label")}
          {text("aboutCtaUrl", "Link URL", { placeholder: "/about" })}
        </div>
        <CloudinaryUploadButton buttonLabel="Upload about image" folder="arevei/blog/site" className="btn btn-sm" onUploaded={(asset) => set("aboutImageUrl", asset.link)} />
      </section>

      <section className="glass-panel space-y-4 rounded-xl p-5">
        <div>
          <h2 className="font-semibold">Promo card</h2>
          <p className="field-hint mt-1">
            Your own promotion in the sponsored slot under the share buttons. It also shows whenever a Google ad cannot.
          </p>
        </div>
        {toggle("promoEnabled", "Show the promo card")}
        <div className="grid gap-4 sm:grid-cols-2">
          {text("promoLabel", "Small label")}
          {text("promoTitle", "Headline")}
        </div>
        {text("promoText", "Text", { area: true })}
        <div className="grid gap-4 sm:grid-cols-2">
          {text("promoCtaLabel", "Button label")}
          {text("promoLinkUrl", "Button URL", { placeholder: "/meet" })}
        </div>
        {text("promoImageUrl", "Image URL (optional)", { placeholder: "https://…" })}
        <CloudinaryUploadButton buttonLabel="Upload promo image" folder="arevei/blog/site" className="btn btn-sm" onUploaded={(asset) => set("promoImageUrl", asset.link)} />
      </section>

      <section className="glass-panel space-y-4 rounded-xl p-5">
        <div>
          <h2 className="font-semibold">Google AdSense</h2>
          <p className="field-hint mt-1">
            When enabled, the sponsored slot shows a Google ad to visitors who accepted cookies, and the promo card to everyone else.
            Your AdSense account must have arevei.com approved, and the site needs an ads.txt file, before ads fill.
          </p>
        </div>
        {toggle("adsenseEnabled", "Show Google ads in the article sidebar")}
        <div className="grid gap-4 sm:grid-cols-2">
          {text("adsenseClient", "Publisher ID", { placeholder: "ca-pub-1234567890123456" })}
          {text("adsenseSlot", "Ad unit slot ID", { placeholder: "1234567890" })}
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
        {notice ? <p className={`text-sm ${notice.tone === "error" ? "text-danger" : "text-accent"}`} role="status">{notice.text}</p> : null}
      </div>
    </form>
  );
}
