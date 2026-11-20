import Link from "next/link";
import { LayoutDashboard, Newspaper, Settings, Sparkles, Users } from "lucide-react";

import { LogoutButton } from "@/components/admin/logout-button";
import { canManageAllPosts, canManageUsers } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard, show: true },
    { href: "/dashboard/posts", label: "Posts", icon: Newspaper, show: true },
    { href: "/dashboard/posts/new?ai=1", label: "Write with AI", icon: Sparkles, show: true },
    { href: "/dashboard/settings", label: "Blog settings", icon: Settings, show: canManageAllPosts(session.role) },
    { href: "/dashboard/team", label: "Team", icon: Users, show: canManageUsers(session.role) },
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-panel/80 px-4 py-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:py-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-display text-base font-bold text-ink">A</span>
          <span className="font-display text-lg font-bold tracking-tight">Arevei Admin</span>
        </Link>

        <nav className="mt-4 flex gap-1 overflow-x-auto lg:mt-8 lg:flex-col lg:overflow-visible">
          {navItems
            .filter((item) => item.show)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-white/[0.06] hover:text-foreground"
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
        </nav>

        <div className="mt-4 hidden border-t border-line pt-4 lg:mt-auto lg:block">
          <p className="truncate px-2 text-sm font-semibold">{session.name}</p>
          <p className="truncate px-2 text-xs text-muted">{session.email}</p>
          <p className="mt-1 px-2 text-xs font-semibold text-accent">{session.role}</p>
          <div className="mt-3 px-2">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
