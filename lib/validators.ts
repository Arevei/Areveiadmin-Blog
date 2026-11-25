import { z } from "zod";

import { BRIEF_LIMITS, BRIEF_TOPIC_MIN, tooLongMessage, type BriefField } from "@/lib/ai/brief-limits";
import { EDITOR_MODES, POST_STATUSES, USER_ROLES } from "@/lib/constants";

export const bootstrapOwnerSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.email("Enter a valid email address").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.email("Enter a valid email address").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(USER_ROLES),
});

export const savePostSchema = z.object({
  title: z.string().trim().min(5, "Title is required"),
  slug: z
    .string()
    .trim()
    .min(3, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  excerpt: z.string().trim().min(20, "Excerpt should be at least 20 characters"),
  seoTitle: z.string().trim().optional().default(""),
  seoDescription: z.string().trim().optional().default(""),
  focusKeyword: z.string().trim().max(120).optional().default(""),
  noindex: z.boolean().optional().default(false),
  faqs: z
    .array(z.object({ question: z.string().trim().min(3), answer: z.string().trim().min(3) }))
    .max(12)
    .default([]),
  category: z.string().trim().min(2, "Category is required"),
  tags: z.array(z.string().trim().min(1)).default([]),
  keyTakeaways: z.array(z.string().trim().min(1)).default([]),
  coverImageUrl: z.string().trim().min(1, "Cover image URL or path is required"),
  coverImageAlt: z.string().trim().optional().default(""),
  contentHtml: z.string().trim().min(1, "Post content is required"),
  editorMode: z.enum(EDITOR_MODES),
  authorName: z.string().trim().min(2, "Author name is required"),
  authorRole: z.string().trim().min(2, "Author role is required"),
  status: z.enum(POST_STATUSES),
  publishedAt: z.string().trim().nullable().optional(),
});

export const siteSettingsSchema = z.object({
  aboutTitle: z.string().trim().max(80),
  aboutText: z.string().trim().max(600),
  aboutImageUrl: z.string().trim().max(500),
  aboutCtaLabel: z.string().trim().max(40),
  aboutCtaUrl: z.string().trim().max(500),
  promoEnabled: z.boolean(),
  promoLabel: z.string().trim().max(40),
  promoTitle: z.string().trim().max(120),
  promoText: z.string().trim().max(300),
  promoImageUrl: z.string().trim().max(500),
  promoCtaLabel: z.string().trim().max(40),
  promoLinkUrl: z.string().trim().max(500),
  adsenseEnabled: z.boolean(),
  adsenseClient: z.string().trim().regex(/^(ca-pub-d{10,20})?$/, "AdSense client looks like ca-pub-1234567890123456"),
  adsenseSlot: z.string().trim().regex(/^d{0,20}$/, "AdSense slot is the numeric ad unit id"),
});

const briefText = (field: BriefField) =>
  z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value.length > BRIEF_LIMITS[field]) {
        ctx.addIssue({ code: "custom", message: tooLongMessage(field, value.length) });
      }
    });

export const generatePostSchema = z.object({
  topic: briefText("topic").refine(
    (value) => value.length >= BRIEF_TOPIC_MIN,
    "Topic is too short: describe it in a few words.",
  ),
  primaryKeyword: briefText("primaryKeyword").optional().default(""),
  secondaryKeywords: briefText("secondaryKeywords").optional().default(""),
  audience: briefText("audience").optional().default(""),
  tone: briefText("tone").optional().default("Practical and direct"),
  length: z.enum(["short", "standard", "long"]).default("standard"),
  notes: briefText("notes").optional().default(""),
  category: z.string().trim().max(80).optional().default(""),
});

export const assistSchema = z.object({
  action: z.enum(["seo", "rewrite", "shorten", "expand"]),
  title: z.string().max(300).optional().default(""),
  focusKeyword: z.string().max(120).optional().default(""),
  contentHtml: z.string().max(400000).optional().default(""),
  selection: z.string().max(20000).optional().default(""),
});
