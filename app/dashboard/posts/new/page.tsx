import { PostEditor } from "@/components/editor/post-editor-loader";
import { requireSession } from "@/lib/auth/session";
import { getPostCategories } from "@/lib/services/posts";
import { getSiteSettings } from "@/lib/services/settings";
import { getSiteUrl } from "@/lib/site";

type PageProps = {
  searchParams: Promise<{ ai?: string }>;
};

export default async function NewPostPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const [{ ai }, site, categories] = await Promise.all([searchParams, getSiteSettings(), getPostCategories()]);

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold tracking-tight">New post</h1>
      <PostEditor
        mode="create"
        currentUser={{ name: session.name, role: session.role }}
        siteUrl={getSiteUrl()}
        site={site}
        categories={categories}
        startWithAi={ai === "1"}
      />
    </div>
  );
}
