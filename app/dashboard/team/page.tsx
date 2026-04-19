import { redirect } from "next/navigation";

import { TeamManager } from "@/components/admin/team-manager";
import { requireSession } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/permissions";
import { getUsers } from "@/lib/services/users";

export default async function TeamPage() {
  const session = await requireSession();

  if (!canManageUsers(session.role)) {
    redirect("/dashboard");
  }

  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#647267]">
          Team
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold text-[#10231c]">
          Manage blog users
        </h1>
      </div>

      <TeamManager
        users={users.map((user) => ({
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          createdAt: user.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
