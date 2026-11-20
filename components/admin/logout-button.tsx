"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full border border-line bg-white/[0.04] px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:text-accent"
    >
      Log out
    </button>
  );
}
