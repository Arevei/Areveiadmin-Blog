import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/admin/auth-panel";
import { getSession } from "@/lib/auth/session";
import { getUserCount } from "@/lib/services/users";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  const userCount = await getUserCount();
  const needsSetup = userCount === 0;

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="px-2 sm:px-4">
          <span className="inline-flex rounded-full border border-[#10231c]/12 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#10231c]">
            Arevei publishing suite
          </span>
          <h1 className="mt-6 max-w-2xl font-display text-5xl font-bold leading-[1.02] text-[#10231c] sm:text-6xl">
            Build blog posts dynamically, manage your team, and publish straight from MongoDB.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5f6f66]">
            This admin panel stores every blog post in your Atlas database, supports Froala and
            raw HTML editing, and exposes public APIs that keep the frontend blog live and dynamic.
          </p>
        </section>

        <AuthPanel needsSetup={needsSetup} />
      </div>
    </main>
  );
}
