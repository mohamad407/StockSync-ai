"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
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

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className="h-5 w-5"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.64 5.93c4.46-4.13 7.13-10.2 7.13-17.58Z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.99 23.99 0 0 0 0 21.56l7.98-6.19Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.85-5.87l-7.64-5.93c-2.12 1.42-4.83 2.26-8.21 2.26-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
    </svg>
  );
}

function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";

  const messages: Record<string, string> = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-not-found": "No account was found. Please sign up first.",
    "auth/wrong-password": "Your email or password is incorrect.",
    "auth/invalid-credential": "Your email or password is incorrect.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Please choose a stronger password.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/operation-not-allowed":
      "This sign-in method is not enabled in Firebase.",
    "auth/popup-closed-by-user": "The Google sign-in window was closed.",
    "auth/popup-blocked":
      "Your browser blocked the sign-in window. Allow pop-ups and try again.",
    "auth/cancelled-popup-request":
      "Another sign-in window is already open.",
    "auth/unauthorized-domain":
      "This domain is not authorized in Firebase Authentication.",
  };

  return messages[code] ?? "Something went wrong. Please try again.";
}

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
            "We couldn't synchronize your profile. Check your connection and retry.",
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
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setBusy(true);

    try {
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setError("");

    try {
      await signOut(firebaseAuth);
    } catch {
      setError("Unable to sign out. Please try again.");
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3faf6]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
          <p className="mt-4 text-sm text-emerald-900">
            Preparing your cozy kitchen...
          </p>
        </div>
      </main>
    );
  }

  if (user && !profileReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3faf6] px-5">
        <section className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl shadow-emerald-900/5">
          <div className="text-5xl" aria-hidden="true">🌿</div>
          <h1 className="mt-4 text-2xl font-bold text-emerald-950">
            Almost home!
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            We're securely setting up your StockSync AI profile.
          </p>

          {error ? (
            <>
              <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </p>
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
                    setError("Profile setup failed. Please try again later.");
                  });
                }}
                className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Retry setup
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="ml-3 mt-5 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Sign out
              </button>
            </>
          ) : (
            <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
          )}
        </section>
      </main>
    );
  }

  if (user) {
    return (
      <>
        <div className="flex items-center justify-end gap-3 border-b border-emerald-100 bg-white px-5 py-3">
          <span className="max-w-[60%] truncate text-sm text-slate-600">
            {user.displayName || user.email}
          </span>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
          >
            Sign out
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f2f8ff] text-slate-800">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-2">
        {/* Anime-inspired illustration panel */}
        <section className="relative flex flex-col overflow-hidden bg-gradient-to-br from-[#e9f8e9] via-[#fff8e9] to-[#d7f0e5] px-6 pb-8 pt-8 sm:px-10 lg:min-h-screen lg:px-14 lg:pb-12 lg:pt-10">
          <div className="absolute -right-12 top-20 h-40 w-40 animate-pulse rounded-full bg-amber-200/30 blur-2xl" />
          <div className="absolute -left-10 top-1/2 h-44 w-44 rounded-full bg-emerald-200/30 blur-2xl" />

          <div className="relative z-10 flex items-center gap-3">
            <span className="text-4xl" aria-hidden="true">🌿</span>
            <span className="text-2xl font-extrabold tracking-tight text-emerald-950 sm:text-3xl">
              StockSync <span className="text-emerald-600">AI</span>
            </span>
          </div>

          <div className="relative z-10 mt-10 max-w-xl sm:mt-14">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/70 px-4 py-2 text-xs font-semibold text-emerald-800 shadow-sm backdrop-blur">
              <span aria-hidden="true">✦</span>
              Your happy little home assistant
            </p>

            <h2 className="max-w-lg text-4xl font-extrabold leading-tight tracking-tight text-emerald-950 sm:text-5xl xl:text-6xl">
              Smarter Groceries.
              <br />
              <span className="text-emerald-600">
                Happier Homes.
              </span>
            </h2>

            <p className="mt-5 max-w-md text-base leading-7 text-slate-600 sm:text-lg">
              Keep track of your pantry, plan delicious meals, and make
              shopping feel like a little adventure.
            </p>
          </div>

          {/* CSS/emoji illustration: works without extra image dependencies */}
          <div className="relative z-10 mx-auto my-8 flex min-h-[280px] w-full max-w-lg flex-1 items-center justify-center sm:min-h-[340px] lg:my-4">
            <div className="absolute left-4 top-8 animate-bounce text-3xl [animation-duration:3.5s]" aria-hidden="true">✦</div>
            <div className="absolute right-7 top-12 animate-pulse text-3xl text-amber-500" aria-hidden="true">✧</div>
            <div className="absolute bottom-9 left-8 animate-pulse text-2xl text-emerald-500" aria-hidden="true">♡</div>

            <div className="relative w-full max-w-md">
              <div className="absolute inset-x-7 bottom-2 h-8 rounded-full bg-emerald-900/10 blur-xl" />

              <div className="relative rounded-[2rem] border border-white/80 bg-white/65 p-5 shadow-xl shadow-emerald-900/10 backdrop-blur-sm sm:p-7">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                      A little daily magic
                    </p>
                    <p className="mt-1 text-lg font-bold text-emerald-950">
                      Fresh & happy
                    </p>
                  </div>
                  <span className="rounded-2xl bg-amber-100 p-3 text-2xl" aria-hidden="true">☀️</span>
                </div>

                <div className="relative flex items-end justify-center gap-3 rounded-3xl bg-gradient-to-b from-[#e5f5df] to-[#f7f3d9] px-3 pb-4 pt-7 sm:gap-5 sm:px-5">
                  <span className="absolute left-5 top-3 text-xl" aria-hidden="true">✿</span>
                  <span className="absolute right-6 top-5 text-lg" aria-hidden="true">✦</span>

                  <div className="animate-[float_4s_ease-in-out_infinite] text-5xl sm:text-7xl" role="img" aria-label="Fresh vegetables">
                    🥬
                  </div>
                  <div className="animate-[float_4s_ease-in-out_infinite] text-6xl sm:text-8xl" style={{ animationDelay: "0.5s" }} role="img" aria-label="Basket of groceries">
                    🧺
                  </div>
                  <div className="animate-[float_4s_ease-in-out_infinite] text-5xl sm:text-7xl" style={{ animationDelay: "1s" }} role="img" aria-label="Fresh apples">
                    🍎
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-3xl" aria-hidden="true">
                    🐱
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-emerald-950">
                      Your pantry buddy
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Every little thing, right where it belongs.
                    </p>
                  </div>
                  <span className="ml-auto text-xl" aria-hidden="true">💚</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { icon: "📦", title: "Track", subtitle: "Inventory" },
              { icon: "🍲", title: "Plan", subtitle: "Meals" },
              { icon: "🛒", title: "Shop", subtitle: "Smarter" },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/80 bg-white/75 px-2 py-4 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md sm:px-4 sm:py-5"
              >
                <div className="text-2xl sm:text-3xl" aria-hidden="true">
                  {feature.icon}
                </div>
                <p className="mt-2 text-sm font-bold text-emerald-950 sm:text-base">
                  {feature.title}
                </p>
                <p className="text-xs text-slate-600 sm:text-sm">
                  {feature.subtitle}
                </p>
              </div>
            ))}
          </div>

          <p className="relative z-10 mt-6 text-center text-xs text-emerald-900/60">
            Made for happier homes, one grocery at a time ♡
          </p>
        </section>

        {/* Authentication panel */}
        <section className="relative flex items-center justify-center px-4 py-8 sm:px-8 sm:py-12 lg:px-12 xl:px-16">
          <div className="pointer-events-none absolute right-12 top-10 animate-pulse text-4xl text-emerald-200" aria-hidden="true">
            ✿
          </div>
          <div className="pointer-events-none absolute bottom-12 left-10 animate-bounce text-3xl text-emerald-200 [animation-duration:4s]" aria-hidden="true">
            ♡
          </div>

          <div className="relative w-full max-w-lg animate-[fadeIn_0.7s_ease-out] rounded-[2rem] border border-white/90 bg-white/90 p-6 shadow-2xl shadow-emerald-950/10 backdrop-blur-xl sm:p-9 lg:p-10">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-3xl shadow-sm ring-1 ring-emerald-100" aria-hidden="true">
                🌱
              </div>

              <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {mode === "signin" ? "Welcome back!" : "Let's get growing!"}
              </h1>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600 sm:text-base">
                {mode === "signin"
                  ? "Sign in to your account and make home life a little easier."
                  : "Create your account and start your happier-home journey."}
              </p>
            </div>

            <div className="mt-7 grid grid-cols-2 rounded-2xl bg-[#eff6f3] p-1.5">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError("");
                }}
                className={`rounded-xl px-3 py-3 text-sm font-bold transition-all duration-300 ${
                  mode === "signin"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-700/20"
                    : "text-slate-600 hover:bg-white/70"
                }`}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
                className={`rounded-xl px-3 py-3 text-sm font-bold transition-all duration-300 ${
                  mode === "signup"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-700/20"
                    : "text-slate-600 hover:bg-white/70"
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Email address
                </label>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5 shrink-0 text-slate-400"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
                    <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" />
                  </svg>

                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Password
                </label>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5 shrink-0 text-slate-400"
                  >
                    <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.7" />
                    <circle cx="12" cy="15" r="1" fill="currentColor" />
                  </svg>

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
                    placeholder="At least 6 characters"
                    className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm leading-5 text-rose-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-700/20 transition duration-300 hover:-translate-y-0.5 hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy
                  ? "Please wait..."
                  : mode === "signin"
                    ? "Sign In"
                    : "Create My Account"}

                {!busy && (
                  <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                    →
                  </span>
                )}
              </button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-400">
                OR CONTINUE WITH
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleMark />
              Continue with Google
            </button>

            <p className="mt-7 text-center text-sm text-slate-500">
              {mode === "signin"
                ? "New to StockSync AI?"
                : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError("");
                }}
                className="font-bold text-emerald-700 underline decoration-emerald-300 underline-offset-4 transition hover:text-emerald-900"
              >
                {mode === "signin" ? "Create account" : "Sign in"}
              </button>
            </p>

            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
              Your account is protected by Firebase authentication.
            </p>
          </div>
        </section>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}
