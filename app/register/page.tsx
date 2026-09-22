import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthError } from "next-auth";
import { signIn, googleEnabled } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { hashPassword } from "@/lib/password";
import { notifyAdminsOfNewUser } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Enter a valid email and a password of at least 8 characters.",
  mismatch: "Those passwords don't match.",
  exists: "An account with that email already exists — try signing in instead.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function register(formData: FormData) {
    "use server";
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    const parsed = registerSchema.safeParse({
      email: formData.get("email"),
      password,
    });
    if (!parsed.success) redirect("/register?error=invalid");
    if (password !== confirmPassword) redirect("/register?error=mismatch");

    const { email } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) redirect("/register?error=exists");

    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: { email, passwordHash, isApproved: isAdminEmail(email) },
    });
    await notifyAdminsOfNewUser(email);

    try {
      await signIn("credentials", { email, password, redirectTo: "/board" });
    } catch (err) {
      // Account was created above regardless — this only covers the rare
      // case where auto-sign-in itself fails right after.
      if (err instanceof AuthError) {
        redirect("/login?error=CredentialsSignin");
      }
      throw err;
    }
  }

  async function registerWithGoogle() {
    "use server";
    try {
      await signIn("google", { redirectTo: "/board" });
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
            Create your account
          </h1>
          <p className="mt-2 text-[15px] text-text-secondary">
            New accounts need a quick approval before they can use the board.
          </p>
        </div>

        <div className="mt-7">
          {error && (
            <div className="mb-3 rounded-md border border-danger/30 bg-danger/10 p-3 text-center text-[14px] text-danger">
              {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
            </div>
          )}

          <form action={register} className="space-y-3">
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
              minLength={8}
              placeholder="Password (at least 8 characters)"
              className="w-full rounded-md border border-border bg-surface-1 px-4 py-3 text-[15px] text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              placeholder="Confirm password"
              className="w-full rounded-md border border-border bg-surface-1 px-4 py-3 text-[15px] text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              type="submit"
              className="w-full rounded-md bg-accent px-4 py-3 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Create account
            </button>
          </form>

          {googleEnabled && (
            <>
              <div className="my-4 flex items-center gap-3 text-[13px] text-text-dim">
                <div className="h-px flex-1 bg-border" />
                or
                <div className="h-px flex-1 bg-border" />
              </div>

              <form action={registerWithGoogle}>
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
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
