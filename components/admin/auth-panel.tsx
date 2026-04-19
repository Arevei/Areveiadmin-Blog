"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AuthPanelProps = {
  needsSetup: boolean;
};

type FormState = {
  name?: string;
  email: string;
  password: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  password: "",
};

export function AuthPanel({ needsSetup }: AuthPanelProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = needsSetup ? "/api/bootstrap/owner" : "/api/auth/login";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        needsSetup
          ? formState
          : {
              email: formState.email,
              password: formState.password,
            },
      ),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="glass-panel w-full max-w-xl rounded-[2rem] p-8 sm:p-10">
      <div className="mb-8">
        <span className="inline-flex rounded-full border border-[#0f8b6d]/20 bg-[#0f8b6d]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f8b6d]">
          {needsSetup ? "Initial setup" : "Secure sign in"}
        </span>
        <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-[#10231c]">
          {needsSetup ? "Create the owner account" : "Welcome back to Arevei Admin"}
        </h1>
        <p className="mt-3 max-w-lg text-base text-[#5f6f66]">
          {needsSetup
            ? "This is the first login for the blog system. Create the owner account, then invite editors and authors from the team page."
            : "Sign in to manage blog posts, publish updates, and collaborate with your content team."}
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {needsSetup ? (
          <div className="space-y-2">
            <label className="field-label" htmlFor="name">
              Owner name
            </label>
            <input
              id="name"
              className="field-input"
              value={formState.name}
              onChange={(event) =>
                setFormState((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Arog Sharma"
              required
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="field-label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            className="field-input"
            value={formState.email}
            onChange={(event) =>
              setFormState((current) => ({ ...current, email: event.target.value }))
            }
            placeholder="admin@arevei.com"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="field-input"
            value={formState.password}
            onChange={(event) =>
              setFormState((current) => ({ ...current, password: event.target.value }))
            }
            placeholder="Minimum 8 characters"
            required
          />
        </div>

        {error ? <p className="field-error">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-full bg-[#10231c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f8b6d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? "Please wait..."
            : needsSetup
              ? "Create owner account"
              : "Sign in"}
        </button>
      </form>
    </div>
  );
}
