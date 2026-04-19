"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImagePlus } from "lucide-react";

type UploadedAsset = {
  link: string;
  secureUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  originalFilename?: string;
};

type CloudinaryUploadButtonProps = {
  buttonLabel: string;
  folder?: string;
  className?: string;
  accept?: string;
  onUploaded: (asset: UploadedAsset) => void;
};

export function CloudinaryUploadButton({
  buttonLabel,
  folder,
  className,
  accept = "image/*",
  onUploaded,
}: CloudinaryUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);

    const body = new FormData();
    body.append("file", file);

    if (folder) {
      body.append("folder", folder);
    }

    try {
      const response = await fetch("/api/uploads/images", {
        method: "POST",
        body,
      });

      const data = (await response.json()) as UploadedAsset & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      onUploaded(data);
      event.target.value = "";
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={
          className ||
          "inline-flex items-center justify-center gap-2 rounded-full border border-[#14261d]/12 bg-white/78 px-4 py-2 text-sm font-semibold text-[#10231c] transition hover:border-[#0f8b6d]/35 hover:text-[#0f8b6d] disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        <ImagePlus className="h-4 w-4" />
        {uploading ? "Uploading..." : buttonLabel}
      </button>

      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
