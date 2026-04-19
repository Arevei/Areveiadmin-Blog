export const SESSION_COOKIE_NAME = "arevei-admin-session";

export const USER_ROLES = ["ADMIN", "EDITOR", "AUTHOR"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const POST_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const EDITOR_MODES = ["FROALA", "HTML"] as const;
export type EditorMode = (typeof EDITOR_MODES)[number];

export const APP_NAME = "Arevei Admin";
export const APP_DESCRIPTION =
  "Dynamic blog management system for authoring, publishing, and syncing Arevei blog posts.";
