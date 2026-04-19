import type { BlogPostDocument } from "@/lib/models/blog-post";
import type { SessionUser } from "@/lib/auth/session";

export function canManageUsers(role: SessionUser["role"]) {
  return role === "ADMIN";
}

export function canManageAllPosts(role: SessionUser["role"]) {
  return role === "ADMIN" || role === "EDITOR";
}

export function canEditPost(user: SessionUser, post: BlogPostDocument) {
  return canManageAllPosts(user.role) || post.createdBy.toString() === user.userId;
}

export function canDeletePost(user: SessionUser, post: BlogPostDocument) {
  return canManageAllPosts(user.role) || post.createdBy.toString() === user.userId;
}
