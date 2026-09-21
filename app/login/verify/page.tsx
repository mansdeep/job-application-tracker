export default function VerifyRequestPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-md border border-border bg-surface-2 p-6 text-center">
        <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-accent/15 text-accent">
          ✓
        </div>
        <h1 className="text-[15px] font-semibold tracking-[-0.02em] text-text-primary">
          Check your email
        </h1>
        <p className="mt-2 text-[13px] text-text-secondary">
          We sent you a sign-in link. Click it to continue.
        </p>
      </div>
    </main>
  );
}
