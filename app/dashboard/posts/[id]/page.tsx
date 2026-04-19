import { notFound } from "next/navigation";

import { PostEditorForm } from "@/components/admin/post-editor-form";
import { requireSession } from "@/lib/auth/session";
import { serializePost } from "@/lib/blog";
import { getAccessiblePostById } from "@/lib/services/posts";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPostPage({ params }: PageProps) {
  const session = await requireSession();
  const { id } = await params;
  const post = await getAccessiblePostById(id, session);

  if (!post) {
    notFound();
  }

  const serialized = serializePost(post);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#647267]">
          Edit post
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold text-[#10231c]">
          {serialized.title}
        </h1>
      </div>

      <PostEditorForm
        mode="edit"
        currentUser={{
          name: session.name,
          role: session.role,
        }}
        initialPost={{
          id: serialized.id,
          title: serialized.title,
          slug: serialized.slug,
          excerpt: serialized.excerpt,
          seoTitle: serialized.seoTitle,
          seoDescription: serialized.seoDescription,
          category: serialized.category,
          tags: serialized.tags,
          keyTakeaways: serialized.keyTakeaways,
          thumbnail: serialized.thumbnail,
          thumbnailAlt: serialized.thumbnailAlt,
          contentHtml: serialized.contentHtml,
          editorMode: serialized.editorMode,
          author: serialized.author,
          authorRole: serialized.authorRole,
          status: serialized.status,
          publishedAt: serialized.publishedAt,
        }}
      />
    </div>
  );
}
