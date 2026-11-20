"use client";

import { Maximize2, Minimize2, Monitor, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type PreviewFrameProps = {
  /** Public site origin. The frame loads the site's real /blog/preview route. */
  siteUrl: string;
  /** The draft, shaped like the public API's post object. */
  post: Record<string, unknown>;
  site: Record<string, unknown>;
};

const DEVICES = {
  desktop: { width: 1440, label: "Desktop", icon: Monitor },
  mobile: { width: 390, label: "Mobile", icon: Smartphone },
} as const;

/**
 * Shows the draft inside the public site itself. The iframe is the site's own
 * article page, fed the draft over postMessage, so layout, fonts and spacing
 * are the production ones rather than an imitation kept in the admin.
 */
export function PreviewFrame({ siteUrl, post, site }: PreviewFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const [expanded, setExpanded] = useState(false);
  const [box, setBox] = useState({ width: 480, height: 640 });

  const origin = new URL(siteUrl).origin;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin === origin && event.data?.type === "arevei-blog-preview-ready") setReady(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin]);

  useEffect(() => {
    if (!ready) return;
    frameRef.current?.contentWindow?.postMessage({ type: "arevei-blog-preview", post, site }, origin);
  }, [ready, post, site, origin]);

  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setBox({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const frameWidth = DEVICES[device].width;
  const scale = Math.min(1, box.width / frameWidth);

  return (
    <div className={expanded ? "fixed inset-0 z-50 flex flex-col bg-background p-4" : "flex h-full flex-col"}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-1" role="group" aria-label="Preview size">
          {(Object.keys(DEVICES) as (keyof typeof DEVICES)[]).map((key) => {
            const Icon = DEVICES[key].icon;
            return (
              <button key={key} type="button" className="tool-button" aria-pressed={device === key} onClick={() => setDevice(key)}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {DEVICES[key].label}
              </button>
            );
          })}
        </div>
        <button type="button" className="tool-button" onClick={() => setExpanded((current) => !current)}>
          {expanded ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
          {expanded ? "Close" : "Full screen"}
        </button>
      </div>

      <div ref={boxRef} className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-line bg-black">
        <iframe
          ref={frameRef}
          title="Live article preview"
          src={`${origin}/blog/preview`}
          className="absolute left-1/2 top-0 origin-top border-0"
          style={{
            width: frameWidth,
            height: box.height / scale,
            transform: `translateX(-50%) scale(${scale})`,
          }}
        />
        {!ready ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-6 text-center text-sm text-muted">
            Loading the live site preview from {origin}…
          </div>
        ) : null}
      </div>
    </div>
  );
}
