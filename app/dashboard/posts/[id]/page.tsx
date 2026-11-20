import { notFound } from "next/navigation";

import { PostEditor } from "@/components/editor/post-editor-loader";
import { requireSession } from "@/lib/auth/session";
import { serializePost } from "@/lib/blog";
import { getAccessiblePostById, getPostCategories } from "@/lib/services/posts";
import { getSiteSettings } from "@/lib/services/settings";
import { getSiteUrl } from "@/lib/site";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPostPage({ params }: PageProps) {
  const session = await requireSession();
  const { id } = await params;
  const [post, site, categories] = await Promise.all([
    getAccessiblePostById(id, session),
    getSiteSettings(),
    getPostCategories(),
  ]);

  if (!post) notFound();

  const serialized = serializePost(post);

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold tracking-tight">Edit post</h1>
      <PostEditor
        key={serialized.id}
        mode="edit"
        currentUser={{ name: session.name, role: session.role }}
        siteUrl={getSiteUrl()}
        site={site}
        categories={categories}
        initialPost={{
          id: serialized.id,
          title: serialized.title,
          slug: serialized.slug,
          excerpt: serialized.excerpt,
          seoTitle: serialized.seoTitle,
          seoDescription: serialized.seoDescription,
          focusKeyword: serialized.focusKeyword,
          noindex: serialized.noindex,
          // Only questions an editor typed in; ones found in the article are re-derived on every render.
          faqs: (post.faqs || []).map((faq) => ({ question: faq.question, answer: faq.answer })),
          category: serialized.category,
          tags: serialized.tags,
          keyTakeaways: serialized.keyTakeaways,
          thumbnail: serialized.thumbnail,
          thumbnailAlt: post.coverImageAlt || "",
          contentHtml: serialized.contentHtml,
          editorMode: serialized.editorMode,
          author: serialized.author,
          authorRole: serialized.authorRole,
          status: serialized.status,
          publishedAt: post.publishedAt ? post.publishedAt.toISOString() : "",
        }}
      />
    </div>
  );
}
