import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = formData.get("folder")?.toString().trim();

  if (!(file instanceof File)) {
    return jsonError("No image file was provided.");
  }

  if (!file.type.startsWith("image/")) {
    return jsonError("Please upload a valid image file.");
  }

  if (file.size > 10 * 1024 * 1024) {
    return jsonError("Images must be 10MB or smaller.");
  }

  try {
    const asset = await uploadImageToCloudinary(file, { folder });

    return NextResponse.json({
      link: asset.secureUrl,
      secureUrl: asset.secureUrl,
      publicId: asset.publicId,
      width: asset.width,
      height: asset.height,
      originalFilename: asset.originalFilename,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return jsonError(message, 500);
  }
}
