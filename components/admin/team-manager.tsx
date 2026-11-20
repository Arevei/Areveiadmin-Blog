"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TeamManagerProps = {
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    createdAt: string;
  }>;
};

export function TeamManager({ users }: TeamManagerProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "AUTHOR",
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Unable to create the user right now.");
      setSubmitting(false);
      return;
    }

    setForm({
      name: "",
      email: "",
      password: "",
      role: "AUTHOR",
    });
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="glass-panel rounded-xl p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold text-foreground">Invite a teammate</h2>
        <p className="mt-2 text-sm text-muted">
          Create separate accounts for admins, editors, or authors so different users can manage
          the blog safely.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="field-label" htmlFor="team-name">
              Name
            </label>
            <input
              id="team-name"
              className="field-input"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="team-email">
              Email
            </label>
            <input
              id="team-email"
              type="email"
              className="field-input"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="team-password">
              Temporary password
            </label>
            <input
              id="team-password"
              type="password"
              className="field-input"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="team-role">
              Role
            </label>
            <select
              id="team-role"
              className="field-input"
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
            >
              <option value="AUTHOR">Author</option>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {error ? <p className="field-error">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-ink transition hover:bg-[#69f6df] disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create user"}
          </button>
        </form>
      </section>

      <section className="glass-panel rounded-xl p-6 sm:p-8">
        <div className="mb-5">
          <h2 className="font-display text-2xl font-bold text-foreground">Current team</h2>
          <p className="mt-2 text-sm text-muted">
            Admins can create users, editors can manage all posts, and authors can work on their
            own posts.
          </p>
        </div>

        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="rounded-xl border border-line bg-white/[0.04] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{user.name}</p>
                  <p className="text-sm text-muted">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-foreground">
                    {user.role}
                  </span>
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                    {user.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
