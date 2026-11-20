import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { canManageAllPosts } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { triggerSiteRebuild } from "@/lib/deploy";
import { getSiteSettings, saveSiteSettings } from "@/lib/services/settings";
import { siteSettingsSchema } from "@/lib/validators";

export async function GET() {
  if (!(await getSession())) return jsonError("Unauthorized", 401);
  return NextResponse.json({ settings: await getSiteSettings() });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!canManageAllPosts(session.role)) return jsonError("Only admins and editors can change blog settings.", 403);

  const parsed = siteSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Invalid settings");

  const settings = await saveSiteSettings(parsed.data);
  triggerSiteRebuild();

  return NextResponse.json({ settings });
}
