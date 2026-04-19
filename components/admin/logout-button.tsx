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
      className="rounded-full border border-[#14261d]/12 bg-white/70 px-4 py-2 text-sm font-semibold text-[#14261d] transition hover:border-[#0f8b6d]/35 hover:text-[#0f8b6d]"
    >
      Log out
    </button>
  );
}
