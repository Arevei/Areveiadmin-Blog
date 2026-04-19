import { PostEditorForm } from "@/components/admin/post-editor-form";
import { requireSession } from "@/lib/auth/session";

export default async function NewPostPage() {
  const session = await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#647267]">
          New post
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold text-[#10231c]">
          Create a dynamic blog article
        </h1>
      </div>

      <PostEditorForm
        mode="create"
        currentUser={{
          name: session.name,
          role: session.role,
        }}
      />
    </div>
  );
}
