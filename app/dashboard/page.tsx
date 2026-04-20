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
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#647267]">
            Overview
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold text-[#10231c]">
            Blog management dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[#647267]">
            Track your publishing pipeline, create new posts, and keep the frontend blog synced
            from the same MongoDB-backed content source.
          </p>
        </div>

        <Link
          href="/dashboard/posts/new"
          className="inline-flex items-center justify-center rounded-full  px-5 py-3 text-sm font-semibold text-white transition bg-[#0f8b6d]"
        >
          New blog post
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <div className="rounded-[1.6rem] border border-[#14261d]/10 bg-white/78 p-5">
          <p className="text-sm font-semibold text-[#647267]">Total posts</p>
          <p className="mt-3 font-display text-4xl font-bold text-[#10231c]">{totalPosts}</p>
        </div>
        <div className="rounded-[1.6rem] border border-[#14261d]/10 bg-white/78 p-5">
          <p className="text-sm font-semibold text-[#647267]">Published</p>
          <p className="mt-3 font-display text-4xl font-bold text-[#0f8b6d]">{publishedPosts}</p>
        </div>
        <div className="rounded-[1.6rem] border border-[#14261d]/10 bg-white/78 p-5">
          <p className="text-sm font-semibold text-[#647267]">Drafts</p>
          <p className="mt-3 font-display text-4xl font-bold text-[#c65d3d]">{draftPosts}</p>
        </div>
        <div className="rounded-[1.6rem] border border-[#14261d]/10 bg-white/78 p-5">
          <p className="text-sm font-semibold text-[#647267]">Team members</p>
          <p className="mt-3 font-display text-4xl font-bold text-[#10231c]">
            {teamCount ?? "Private"}
          </p>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-[#14261d]/10 bg-white/78 p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#10231c]">Recent activity</h2>
            <p className="mt-2 text-sm text-[#647267]">
              Your latest blog posts are listed here so you can jump back into editing quickly.
            </p>
          </div>

          <Link
            href="/dashboard/posts"
            className="text-sm font-semibold text-[#0f8b6d] transition hover:text-[#0a5f4f]"
          >
            View all posts
          </Link>
        </div>

        <div className="space-y-3">
          {posts.slice(0, 5).map((post) => (
            <Link
              key={post.id}
              href={`/dashboard/posts/${post.id}`}
              className="block rounded-[1.4rem] border border-[#14261d]/10 bg-[#f8f3ea] p-4 transition hover:border-[#0f8b6d]/25 hover:bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#10231c]">{post.title}</p>
                  <p className="mt-1 text-sm text-[#647267]">
                    {post.category} · Updated {formatDate(post.updatedAt)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    post.status === "PUBLISHED"
                      ? "bg-[#0f8b6d]/10 text-[#0f8b6d]"
                      : "bg-[#c65d3d]/10 text-[#c65d3d]"
                  }`}
                >
                  {post.status}
                </span>
              </div>
            </Link>
          ))}

          {posts.length === 0 ? (
            <div className="rounded-[1.4rem] border border-dashed border-[#14261d]/14 bg-[#f8f3ea] p-6 text-sm text-[#647267]">
              No posts yet. Create your first article and it will flow into the public API once it
              is published.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
