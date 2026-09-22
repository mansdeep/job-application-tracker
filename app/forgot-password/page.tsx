import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken, sendPasswordResetEmail } from "@/lib/reset-password";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  async function requestReset(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    // Only ever show the same "check your email" state below, whether or
    // not an account exists — otherwise this page could be used to check
    // which emails are registered.
    if (user) {
      const token = await createPasswordResetToken(email);
      try {
        await sendPasswordResetEmail(email, token);
      } catch (err) {
        console.error("[forgot-password] failed to send reset email", err);
      }
    }

    redirect("/forgot-password?sent=1");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-text-primary">
            Reset your password
          </h1>
          <p className="mt-2 text-[15px] text-text-secondary">
            Enter your account email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="mt-7">
          {sent ? (
            <div className="rounded-md border border-border bg-surface-2 p-4 text-center text-[15px] text-text-secondary">
              If an account exists for that email, a reset link is on its
              way. It expires in 1 hour.
            </div>
          ) : (
            <form action={requestReset} className="space-y-3">
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-md border border-border bg-surface-1 px-4 py-3 text-[15px] text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-accent px-4 py-3 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Send reset link
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-[14px] text-text-secondary">
            <Link href="/login" className="text-accent hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
