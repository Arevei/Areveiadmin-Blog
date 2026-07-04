import { createHash } from "node:crypto";

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadFolder?: string;
};

export type UploadedImageAsset = {
  secureUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  originalFilename?: string;
};

function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const uploadFolder = process.env.CLOUDINARY_UPLOAD_FOLDER?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Missing Cloudinary configuration. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to arvadmin/.env"
    );
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    uploadFolder,
  };
}

function createSignature(params: Record<string, string>, apiSecret: string) {
  const signatureBase = Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1")
    .update(`${signatureBase}${apiSecret}`)
    .digest("hex");
}

export async function uploadImageToCloudinary(
  file: File,
  options?: {
    folder?: string;
    compression?: "lowest" | "low" | "medium" | "high";
  }
): Promise<UploadedImageAsset> {
  const config = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = options?.folder || config.uploadFolder || "";

  // Compression presets for different quality levels
  const compressionPresets: Record<
    "lowest" | "low" | "medium" | "high",
    { quality: string | number; fetchFormat: string; flags?: string }
  > = {
    lowest: { quality: 20, fetchFormat: "auto", flags: "lossy" },
    low: { quality: 30, fetchFormat: "auto", flags: "lossy" },
    medium: { quality: "auto", fetchFormat: "auto", flags: "lossy" },
    high: { quality: "auto:good", fetchFormat: "auto" },
  };

  const compressionLevel = options?.compression || "lowest";
  const preset = compressionPresets[compressionLevel];

  const signatureParams: Record<string, string> = {
    timestamp,
    folder,
    quality: String(preset.quality),
    fetch_format: preset.fetchFormat,
  };

  const signature = createSignature(signatureParams, config.apiSecret);
  const formData = new FormData();

  formData.append("file", file);
  formData.append("api_key", config.apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);

  if (folder) {
    formData.append("folder", folder);
  }

  // Apply compression settings
  formData.append("quality", String(preset.quality));
  formData.append("fetch_format", preset.fetchFormat);
  if (preset.flags) {
    formData.append("flags", preset.flags);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
    width?: number;
    height?: number;
    original_filename?: string;
    error?: { message?: string };
  };

  if (!response.ok || !data.secure_url || !data.public_id) {
    throw new Error(data.error?.message || "Cloudinary upload failed");
  }

  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    originalFilename: data.original_filename || file.name,
  };
}
