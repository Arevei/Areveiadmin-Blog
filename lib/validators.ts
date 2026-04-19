import { z } from "zod";

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
