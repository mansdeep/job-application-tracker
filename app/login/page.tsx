import { signIn } from "@/auth";

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
          <p className="mb-3 text-center text-[14px] text-text-secondary">
            Enter your email to sign in — first time here creates your
            account automatically, pending a quick approval. No password to
            set or remember.
          </p>

          {error && (
            <div className="mb-3 rounded-md border border-danger/30 bg-danger/10 p-3 text-center text-[14px] text-danger">
              We couldn&apos;t send that link. Please try again in a moment.
            </div>
          )}

          <form action={sendMagicLink} className="space-y-3">
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
              Send magic link
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
