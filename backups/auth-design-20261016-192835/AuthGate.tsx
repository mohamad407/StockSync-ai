"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import { firebaseAuth } from "@/lib/firebase/client";

type AuthMode = "signin" | "signup";

export default function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      setProfileReady(false);
      setError("");
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncProfile() {
      if (!user) {
        setProfileReady(false);
        return;
      }

      try {
        const token = await user.getIdToken();

        const response = await fetch("/api/profile", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Profile synchronization failed.");
        }

        if (!cancelled) {
          setProfileReady(true);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setProfileReady(false);
          setError(
            "We couldn't finish setting up your profile. Check your connection and try again.",
          );
        }
      }
    }

    void syncProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const normalizedEmail = email.trim();

      if (mode === "signup") {
        await createUserWithEmailAndPassword(
          firebaseAuth,
          normalizedEmail,
          password,
        );
      } else {
        await signInWithEmailAndPassword(
          firebaseAuth,
          normalizedEmail,
          password,
        );
      }
    } catch (err) {
      const code =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        typeof err.code === "string"
          ? err.code
          : "";

      const messages: Record<string, string> = {
        "auth/invalid-email": "Enter a valid email address.",
        "auth/user-not-found": "No account was found. Check your email or sign up.",
        "auth/wrong-password": "The email or password is incorrect.",
        "auth/invalid-credential": "The email or password is incorrect.",
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/weak-password": "Choose a stronger password with at least 6 characters.",
        "auth/too-many-requests": "Too many attempts. Please wait and try again.",
        "auth/network-request-failed": "Network error. Check your internet connection.",
        "auth/operation-not-allowed": "Email/password sign-in is not enabled in Firebase.",
      };

      setError(messages[code] ?? "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-700">
        Checking your session…
      </main>
    );
  }

  if (user) {
    if (!profileReady) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">
              Setting up your account
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              Verifying your session and synchronizing your profile.
            </p>
            {error && (
              <div
                role="alert"
                className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setError("");
                setProfileReady(false);
                void user.getIdToken(true).then(async (token) => {
                  const response = await fetch("/api/profile", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (!response.ok) {
                    throw new Error("Profile synchronization failed.");
                  }
                  setProfileReady(true);
                }).catch(() => {
                  setError("Profile setup failed again. Please try later.");
                });
              }}
              className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Retry setup
            </button>
            <button
              type="button"
              onClick={() => void signOut(firebaseAuth)}
              className="ml-3 mt-5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Sign out
            </button>
          </section>
        </main>
      );
    }

    return (
      <>
        <div className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-4 py-2 text-sm">
          <span className="max-w-[60%] truncate text-slate-600">
            {user.email}
          </span>
          <button
            type="button"
            onClick={() => void signOut(firebaseAuth)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-xl font-bold text-white">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            StockSync AI
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === "signin"
              ? "Sign in to manage your household inventory."
              : "Create an account to get started."}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError("");
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === "signin"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === "signup"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600"
            }`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="auth-email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Your session is verified by Firebase before your profile is synchronized.
        </p>
      </section>
    </main>
  );
}
