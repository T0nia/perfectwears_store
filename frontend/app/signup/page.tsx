"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_URL = "https://perfectwears-backend.onrender.com/api";
const TOKEN_KEY = "perfectwears_auth_token";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const next = searchParams.get("next") || "/checkout";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/auth/signup/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data: {
        token?: string;
        error?: string;
      } = await response.json();

      if (!response.ok || !data.token) {
        throw new Error(data.error || "Unable to create your account.");
      }

      localStorage.setItem(TOKEN_KEY, data.token);

      router.replace(next);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your account.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f1edff] px-5 py-10 text-black sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-black/50 transition hover:text-[#7c5cff]"
        >
          ← Perfectwears
        </a>

        <div className="mt-8 rounded-[2rem] bg-white p-7 shadow-sm sm:p-9">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7c5cff] text-2xl text-white">
            ✨
          </div>

          <p className="mt-7 text-[10px] font-black uppercase tracking-[0.2em] text-[#7c5cff]">
            New customer
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            Create your account
          </h1>

          <p className="mt-3 text-sm leading-6 text-black/50">
            Create an account to continue to checkout.
          </p>

          {error && (
            <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-black/50"
              >
                Full name
              </label>

              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-13 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none transition focus:border-[#7c5cff]"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-black/50"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-13 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none transition focus:border-[#7c5cff]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-black/50"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-13 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none transition focus:border-[#7c5cff]"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-black/50"
              >
                Confirm password
              </label>

              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                className="h-13 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none transition focus:border-[#7c5cff]"
                placeholder="Enter your password again"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-13 w-full rounded-xl bg-[#7c5cff] px-6 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#6848e8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-black/50">
            Already have an account?{" "}
            <a
              href={`/login?next=${encodeURIComponent(next)}`}
              className="font-black text-[#7c5cff] hover:underline"
            >
              Log in
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

function SignupLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1edff] px-5">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#7c5cff]/20 border-t-[#7c5cff]" />
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupForm />
    </Suspense>
  );
}