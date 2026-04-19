import Link from "next/link";
import { LayoutDashboard, Newspaper, Users } from "lucide-react";

import { LogoutButton } from "@/components/admin/logout-button";
import { requireSession } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/permissions";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/posts", label: "Posts", icon: Newspaper },
  { href: "/dashboard/team", label: "Team", icon: Users, adminOnly: true },
];

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="glass-panel rounded-[2rem] p-5">
          <div className="rounded-[1.6rem] bg-[#10231c] px-5 py-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">
              Arevei Admin
            </p>
            <h1 className="mt-3 font-display text-2xl font-bold">Publishing workspace</h1>
            <p className="mt-2 text-sm leading-7 text-white/72">
              Manage dynamic blog content, authors, and publishing workflows.
            </p>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => {
              if (item.adminOnly && !canManageUsers(session.role)) {
                return null;
              }

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-[1.2rem] px-4 py-3 text-sm font-semibold text-[#14261d] transition hover:bg-white/72 hover:text-[#0f8b6d]"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-[1.4rem] border border-[#14261d]/10 bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#647267]">
              Signed in as
            </p>
            <p className="mt-2 font-semibold text-[#10231c]">{session.name}</p>
            <p className="text-sm text-[#647267]">{session.email}</p>
            <p className="mt-2 text-xs font-semibold text-[#0f8b6d]">{session.role}</p>
          </div>

          <div className="mt-6">
            <LogoutButton />
          </div>
        </aside>

        <main className="glass-panel rounded-[2rem] p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
