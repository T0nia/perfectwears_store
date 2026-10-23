"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_URL = "https://perfectwears-backend.onrender.com/api";
const TOKEN_KEY = "perfectwears_auth_token";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const next = searchParams.get("next") || "/checkout";

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (token) {
      router.replace(next);
    }
  }, [next, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/auth/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data: {
        token?: string;
        error?: string;
        user?: {
          id: number;
          name: string;
          email: string;
        };
      } = await response.json();

      if (!response.ok || !data.token) {
        throw new Error(data.error || "Unable to log in.");
      }

      localStorage.setItem(TOKEN_KEY, data.token);

      router.replace(next);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to log in. Please try again.",
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
            👋
          </div>

          <p className="mt-7 text-[10px] font-black uppercase tracking-[0.2em] text-[#7c5cff]">
            Welcome back
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            Log in to checkout
          </h1>

          <p className="mt-3 text-sm leading-6 text-black/50">
            Sign in to continue with your Perfectwears order.
          </p>

          {error && (
            <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-13 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none transition focus:border-[#7c5cff]"
                placeholder="Your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-13 w-full rounded-xl bg-[#7c5cff] px-6 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#6848e8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-black/50">
            Don't have an account?{" "}
            <a
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="font-black text-[#7c5cff] hover:underline"
            >
              Create one
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

function LoginLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1edff] px-5">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#7c5cff]/20 border-t-[#7c5cff]" />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}