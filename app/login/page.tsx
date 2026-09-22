import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthError } from "next-auth";
import { signIn, googleEnabled } from "@/auth";

const FEATURES = [
  {
    label: "Track",
    body: "Drag applications across Wishlist, Applied, Interviewing, Offer, and Rejected/Closed.",
  },
  {
    label: "Add",
    body: "Paste a job posting URL to auto-fill company, role, and description — or enter them yourself.",
  },
  {
    label: "Prepare",
    body: "Generate a tailored cover letter, rewritten resume, interview questions, and a company brief for any job.",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; reset?: string }>;
}) {
  const { callbackUrl, error, reset } = await searchParams;

  async function loginWithPassword(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: String(formData.get("email") ?? "").trim().toLowerCase(),
        password: formData.get("password"),
        redirectTo: callbackUrl ?? "/board",
      });
    } catch (err) {
      // signIn() itself throws a redirect on success (NEXT_REDIRECT, not an
      // AuthError) — only intercept real auth failures here and let that
      // one propagate so the successful sign-in redirect still happens.
      if (err instanceof AuthError) {
        redirect(
          `/login?error=CredentialsSignin${callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`,
        );
      }
      throw err;
    }
  }

  async function loginWithGoogle() {
    "use server";
    try {
      await signIn("google", { redirectTo: callbackUrl ?? "/board" });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=${err.type}`);
      }
      throw err;
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-text-primary">
            Job Application Tracker
          </h1>
          <p className="mt-2 text-[15px] text-text-secondary">
            A board for your job search, with AI-written prep for every
            application.
          </p>
        </div>

        <div className="mt-7 space-y-4 rounded-md border border-border bg-surface-2 p-5">
          {FEATURES.map((f) => (
            <div key={f.label} className="flex gap-4">
              <span className="w-16 shrink-0 pt-0.5 font-mono text-[12px] font-medium uppercase tracking-[-0.01em] text-accent">
                {f.label}
              </span>
              <p className="text-[15px] leading-snug text-text-primary">
                {f.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-7">
          {reset && !error && (
            <div className="mb-3 rounded-md border border-border bg-surface-2 p-3 text-center text-[14px] text-text-secondary">
              Password updated — sign in with your new password.
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-md border border-danger/30 bg-danger/10 p-3 text-center text-[14px] text-danger">
              {error === "CredentialsSignin"
                ? "Couldn't sign you in — check your email and password and try again."
                : "Couldn't sign you in with Google. Please try again."}
            </div>
          )}

          <form action={loginWithPassword} className="space-y-3">
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-md border border-border bg-surface-1 px-4 py-3 text-[15px] text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <input
              type="password"
              name="password"
              required
              placeholder="Password"
              className="w-full rounded-md border border-border bg-surface-1 px-4 py-3 text-[15px] text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              type="submit"
              className="w-full rounded-md bg-accent px-4 py-3 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Sign in
            </button>
          </form>

          <p className="mt-2 text-right text-[13px]">
            <Link href="/forgot-password" className="text-accent hover:underline">
              Forgot password?
            </Link>
          </p>

          {googleEnabled && (
            <>
              <div className="my-4 flex items-center gap-3 text-[13px] text-text-dim">
                <div className="h-px flex-1 bg-border" />
                or
                <div className="h-px flex-1 bg-border" />
              </div>

              <form action={loginWithGoogle}>
                <button
                  type="submit"
                  className="w-full rounded-md border border-border bg-surface-1 px-4 py-3 text-[15px] font-medium text-text-primary transition-colors hover:bg-surface-3"
                >
                  Continue with Google
                </button>
              </form>
            </>
          )}

          <p className="mt-5 text-center text-[14px] text-text-secondary">
            New here?{" "}
            <Link href="/register" className="text-accent hover:underline">
              Create an account
            </Link>
            {" "}— new accounts need a quick approval before they can use the
            board.
          </p>
        </div>
      </div>
    </main>
  );
}
