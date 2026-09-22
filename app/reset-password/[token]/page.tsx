import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { newPasswordSchema } from "@/lib/validation";
import {
  verifyPasswordResetToken,
  deletePasswordResetToken,
} from "@/lib/reset-password";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Enter a password of at least 8 characters.",
  mismatch: "Those passwords don't match.",
};

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const email = await verifyPasswordResetToken(token);

  async function resetPassword(formData: FormData) {
    "use server";
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    const parsed = newPasswordSchema.safeParse({ password });
    if (!parsed.success) redirect(`/reset-password/${token}?error=invalid`);
    if (password !== confirmPassword) {
      redirect(`/reset-password/${token}?error=mismatch`);
    }

    const resetEmail = await verifyPasswordResetToken(token);
    if (!resetEmail) redirect("/forgot-password");

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.user.update({ where: { email: resetEmail }, data: { passwordHash } });
    await deletePasswordResetToken(token);

    redirect("/login?reset=1");
  }

  if (!email) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12">
        <div className="w-full max-w-md text-center">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-text-primary">
            Link expired
          </h1>
          <p className="mt-2 text-[15px] text-text-secondary">
            This reset link is invalid or has expired.
          </p>
          <Link
            href="/forgot-password"
            className="mt-5 inline-block text-[15px] text-accent hover:underline"
          >
            Request a new one
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-text-primary">
            Choose a new password
          </h1>
          <p className="mt-2 text-[15px] text-text-secondary">
            For {email}
          </p>
        </div>

        <div className="mt-7">
          {error && (
            <div className="mb-3 rounded-md border border-danger/30 bg-danger/10 p-3 text-center text-[14px] text-danger">
              {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
            </div>
          )}

          <form action={resetPassword} className="space-y-3">
            <input
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="New password (at least 8 characters)"
              className="w-full rounded-md border border-border bg-surface-1 px-4 py-3 text-[15px] text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              placeholder="Confirm new password"
              className="w-full rounded-md border border-border bg-surface-1 px-4 py-3 text-[15px] text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              type="submit"
              className="w-full rounded-md bg-accent px-4 py-3 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Set new password
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
