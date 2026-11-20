import { connectToDatabase } from "@/lib/db";
import { DEFAULT_SITE_SETTINGS, SiteSettingsModel, type SiteSettings } from "@/lib/models/site-settings";

const KEY = "blog";

export async function getSiteSettings(): Promise<SiteSettings> {
  await connectToDatabase();
  const doc = await SiteSettingsModel.findOne({ key: KEY }).lean();
  const settings = { ...DEFAULT_SITE_SETTINGS };

  if (doc) {
    for (const field of Object.keys(DEFAULT_SITE_SETTINGS) as (keyof SiteSettings)[]) {
      const value = (doc as Record<string, unknown>)[field];
      if (value !== undefined && value !== null) (settings as Record<string, unknown>)[field] = value;
    }
  }

  return settings;
}

export async function saveSiteSettings(settings: SiteSettings) {
  await connectToDatabase();
  await SiteSettingsModel.updateOne({ key: KEY }, { $set: { ...settings, key: KEY } }, { upsert: true });
  return getSiteSettings();
}
