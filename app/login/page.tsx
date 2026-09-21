import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;

  async function sendMagicLink(formData: FormData) {
    "use server";
    await signIn("resend", {
      email: formData.get("email"),
      redirectTo: callbackUrl ?? "/board",
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-text-primary">
            Job Application Tracker
          </h1>
          <p className="mt-1 text-[13px] text-text-secondary">
            Sign in with your email — no password needed.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-center text-[13px] text-danger">
            We couldn&apos;t send that link. Please try again in a moment.
          </div>
        )}

        <form action={sendMagicLink} className="space-y-3">
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-accent px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Send magic link
          </button>
        </form>
      </div>
    </main>
  );
}
