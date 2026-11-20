import { models, model, Schema, type Model } from "mongoose";

export type SiteSettings = {
  aboutTitle: string;
  aboutText: string;
  aboutImageUrl: string;
  aboutCtaLabel: string;
  aboutCtaUrl: string;
  promoEnabled: boolean;
  promoLabel: string;
  promoTitle: string;
  promoText: string;
  promoImageUrl: string;
  promoCtaLabel: string;
  promoLinkUrl: string;
  adsenseEnabled: boolean;
  adsenseClient: string;
  adsenseSlot: string;
};

/** Mirrored in the frontend (`src/lib/blog-types.ts`) as the fallback when the API omits `site`. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  aboutTitle: "About Arevei",
  aboutText:
    "Arevei is an AI native company. We bring website and product development, AI agents, automation, design and marketing together to build and manage digital systems for modern businesses.",
  aboutImageUrl: "",
  aboutCtaLabel: "Learn more",
  aboutCtaUrl: "/about",
  promoEnabled: true,
  promoLabel: "Free strategy call",
  promoTitle: "Want this working in your business?",
  promoText: "Book a 30-minute call. We will map the quickest wins for your website, leads and automation.",
  promoImageUrl: "",
  promoCtaLabel: "Schedule a meeting",
  promoLinkUrl: "/meet",
  adsenseEnabled: false,
  adsenseClient: "",
  adsenseSlot: "",
};

type SettingsDoc = SiteSettings & { key: string };

const shape: Record<string, unknown> = { key: { type: String, required: true, unique: true } };
for (const [field, value] of Object.entries(DEFAULT_SITE_SETTINGS)) {
  shape[field] = { type: typeof value === "boolean" ? Boolean : String, default: value, trim: true };
}

const SiteSettingsSchema = new Schema<SettingsDoc>(shape, { timestamps: true });

export const SiteSettingsModel =
  (models.SiteSettings as Model<SettingsDoc> | undefined) ||
  model<SettingsDoc>("SiteSettings", SiteSettingsSchema);
