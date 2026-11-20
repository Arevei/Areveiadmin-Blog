import Link from "next/link";

import { DeletePostButton } from "@/components/admin/delete-post-button";
import { PostOptimizer } from "@/components/admin/post-optimizer";
import { requireSession } from "@/lib/auth/session";
import { getAccessiblePosts } from "@/lib/services/posts";
import { findMetaIssues } from "@/lib/seo/meta-issues";
import { formatDate } from "@/lib/utils";

export default async function PostsPage() {
  const session = await requireSession();
  const posts = await getAccessiblePosts(session);
  const flagged = posts
    .map((post) => ({
      id: post.id as string,
      title: post.title,
      status: post.status,
      issues: findMetaIssues({
        title: post.title,
        excerpt: post.excerpt,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        focusKeyword: post.focusKeyword,
        keyTakeaways: post.keyTakeaways,
        tags: post.tags,
        coverImageAlt: post.coverImageAlt,
      }),
    }))
    .filter((post) => post.issues.length > 0);
  const issueCount = new Map(flagged.map((post) => [post.id, post.issues.length]));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            Posts
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold text-foreground">
            Dynamic blog posts
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-muted">
            Every post here is stored in MongoDB and exposed through the public blog API for the
            Vite frontend.
          </p>
        </div>

        <Link
          href="/dashboard/posts/new"
          className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-ink transition bg-accent"
        >
          New post
        </Link>
      </header>

      <PostOptimizer posts={flagged} />

      <div className="overflow-hidden rounded-xl border border-line bg-white/[0.04]">
        <div className="hidden grid-cols-[1.4fr_0.7fr_0.5fr_0.5fr_0.5fr] gap-4 border-b border-line px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted md:grid">
          <span>Post</span>
          <span>Author</span>
          <span>Status</span>
          <span>Updated</span>
          <span>Actions</span>
        </div>

        <div className="divide-y divide-line">
          {posts.map((post) => (
            <div
              key={post.id}
              className="grid gap-4 px-6 py-5 md:grid-cols-[1.4fr_0.7fr_0.5fr_0.5fr_0.5fr] md:items-center"
            >
              <div>
                <Link
                  href={`/dashboard/posts/${post.id}`}
                  className="font-semibold text-foreground transition hover:text-accent"
                >
                  {post.title}
                </Link>
                <p className="mt-1 text-sm text-muted">
                  {post.category}
                  {issueCount.get(post.id as string) ? (
                    <span className="ml-2 text-warn">· {issueCount.get(post.id as string)} SEO issue{issueCount.get(post.id as string) === 1 ? "" : "s"}</span>
                  ) : null}
                </p>
              </div>

              <div>
                <p className="font-medium text-foreground">{post.authorName}</p>
                <p className="text-sm text-muted">{post.authorRole}</p>
              </div>

              <div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    post.status === "PUBLISHED"
                      ? "bg-accent/10 text-accent"
                      : "bg-danger/10 text-danger"
                  }`}
                >
                  {post.status}
                </span>
              </div>

              <div className="text-sm text-muted">{formatDate(post.updatedAt)}</div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/posts/${post.id}`}
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-accent/50 hover:text-accent"
                >
                  Edit
                </Link>
                <DeletePostButton postId={post.id.toString()} />
              </div>
            </div>
          ))}

          {posts.length === 0 ? (
            <div className="px-6 py-8 text-sm text-muted">
              No posts found yet. Create one and it will appear here immediately.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
