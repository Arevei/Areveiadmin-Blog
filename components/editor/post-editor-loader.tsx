"use client";

import dynamic from "next/dynamic";

/**
 * The editor depends on browser APIs throughout (contentEditable, DOMParser for
 * the SEO checks, the preview iframe), so it is rendered on the client only.
 */
export const PostEditor = dynamic(() => import("./post-editor").then((module) => module.PostEditor), {
  ssr: false,
  loading: () => <p className="py-16 text-center text-sm text-muted">Loading the editor…</p>,
});
