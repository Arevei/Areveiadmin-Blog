import { redirect } from "next/navigation";

import { SettingsForm } from "@/components/admin/settings-form";
import { canManageAllPosts } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/services/settings";

export default async function SettingsPage() {
  const session = await requireSession();
  if (!canManageAllPosts(session.role)) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Blog settings</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Controls the right column of every article: the about card, your promo and the Google ad slot.
        </p>
      </header>
      <SettingsForm initial={await getSiteSettings()} />
    </div>
  );
}
