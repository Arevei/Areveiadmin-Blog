"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeletePostButtonProps = {
  postId: string;
};

export function DeletePostButton({ postId }: DeletePostButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm("Delete this post? This action cannot be undone.");

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    const response = await fetch(`/api/posts/${postId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setDeleting(false);
      window.alert("Unable to delete the post right now.");
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={deleting}
      onClick={handleDelete}
      className="rounded-full border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-60"
    >
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}
