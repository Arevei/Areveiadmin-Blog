import Link from "next/link";

import { DeletePostButton } from "@/components/admin/delete-post-button";
import { requireSession } from "@/lib/auth/session";
import { getAccessiblePosts } from "@/lib/services/posts";
import { formatDate } from "@/lib/utils";

export default async function PostsPage() {
  const session = await requireSession();
  const posts = await getAccessiblePosts(session);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#647267]">
            Posts
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold text-[#10231c]">
            Dynamic blog posts
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[#647267]">
            Every post here is stored in MongoDB and exposed through the public blog API for the
            Vite frontend.
          </p>
        </div>

        <Link
          href="/dashboard/posts/new"
          className="inline-flex items-center justify-center rounded-full bg-[#10231c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f8b6d]"
        >
          New post
        </Link>
      </header>

      <div className="overflow-hidden rounded-[1.8rem] border border-[#14261d]/10 bg-white/78">
        <div className="hidden grid-cols-[1.4fr_0.7fr_0.5fr_0.5fr_0.5fr] gap-4 border-b border-[#14261d]/10 px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#647267] md:grid">
          <span>Post</span>
          <span>Author</span>
          <span>Status</span>
          <span>Updated</span>
          <span>Actions</span>
        </div>

        <div className="divide-y divide-[#14261d]/8">
          {posts.map((post) => (
            <div
              key={post.id}
              className="grid gap-4 px-6 py-5 md:grid-cols-[1.4fr_0.7fr_0.5fr_0.5fr_0.5fr] md:items-center"
            >
              <div>
                <Link
                  href={`/dashboard/posts/${post.id}`}
                  className="font-semibold text-[#10231c] transition hover:text-[#0f8b6d]"
                >
                  {post.title}
                </Link>
                <p className="mt-1 text-sm text-[#647267]">{post.category}</p>
              </div>

              <div>
                <p className="font-medium text-[#10231c]">{post.authorName}</p>
                <p className="text-sm text-[#647267]">{post.authorRole}</p>
              </div>

              <div>
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

              <div className="text-sm text-[#647267]">{formatDate(post.updatedAt)}</div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/posts/${post.id}`}
                  className="rounded-full border border-[#14261d]/12 px-3 py-1.5 text-xs font-semibold text-[#10231c] transition hover:border-[#0f8b6d]/30 hover:text-[#0f8b6d]"
                >
                  Edit
                </Link>
                <DeletePostButton postId={post.id.toString()} />
              </div>
            </div>
          ))}

          {posts.length === 0 ? (
            <div className="px-6 py-8 text-sm text-[#647267]">
              No posts found yet. Create one and it will appear here immediately.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
