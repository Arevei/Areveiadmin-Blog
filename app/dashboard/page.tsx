import Link from "next/link";

import { requireSession } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/permissions";
import { getAccessiblePosts } from "@/lib/services/posts";
import { getUserCount } from "@/lib/services/users";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await requireSession();
  const posts = await getAccessiblePosts(session);
  const totalPosts = posts.length;
  const publishedPosts = posts.filter((post) => post.status === "PUBLISHED").length;
  const draftPosts = totalPosts - publishedPosts;
  const teamCount = canManageUsers(session.role) ? await getUserCount() : null;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            Overview
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold text-foreground">
            Blog management dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-muted">
            Track your publishing pipeline, create new posts, and keep the frontend blog synced
            from the same MongoDB-backed content source.
          </p>
        </div>

        <Link
          href="/dashboard/posts/new"
          className="inline-flex items-center justify-center rounded-full  px-5 py-3 text-sm font-semibold text-ink transition bg-accent"
        >
          New blog post
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <div className="rounded-xl border border-line bg-white/[0.04] p-5">
          <p className="text-sm font-semibold text-muted">Total posts</p>
          <p className="mt-3 font-display text-4xl font-bold text-foreground">{totalPosts}</p>
        </div>
        <div className="rounded-xl border border-line bg-white/[0.04] p-5">
          <p className="text-sm font-semibold text-muted">Published</p>
          <p className="mt-3 font-display text-4xl font-bold text-accent">{publishedPosts}</p>
        </div>
        <div className="rounded-xl border border-line bg-white/[0.04] p-5">
          <p className="text-sm font-semibold text-muted">Drafts</p>
          <p className="mt-3 font-display text-4xl font-bold text-danger">{draftPosts}</p>
        </div>
        <div className="rounded-xl border border-line bg-white/[0.04] p-5">
          <p className="text-sm font-semibold text-muted">Team members</p>
          <p className="mt-3 font-display text-4xl font-bold text-foreground">
            {teamCount ?? "Private"}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white/[0.04] p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Recent activity</h2>
            <p className="mt-2 text-sm text-muted">
              Your latest blog posts are listed here so you can jump back into editing quickly.
            </p>
          </div>

          <Link
            href="/dashboard/posts"
            className="text-sm font-semibold text-accent transition hover:text-accent"
          >
            View all posts
          </Link>
        </div>

        <div className="space-y-3">
          {posts.slice(0, 5).map((post) => (
            <Link
              key={post.id}
              href={`/dashboard/posts/${post.id}`}
              className="block rounded-xl border border-line bg-white/[0.03] p-4 transition hover:border-accent/50 hover:bg-white/[0.07]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{post.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {post.category} · Updated {formatDate(post.updatedAt)}
                  </p>
                </div>
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
            </Link>
          ))}

          {posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-white/[0.03] p-6 text-sm text-muted">
              No posts yet. Create your first article and it will flow into the public API once it
              is published.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
