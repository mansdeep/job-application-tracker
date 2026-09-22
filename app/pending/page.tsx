import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function PendingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const approved =
    isAdminEmail(session.user.email) ||
    (await prisma.user
      .findUnique({ where: { id: session.user.id }, select: { isApproved: true } })
      .then((u) => u?.isApproved ?? false));
  if (approved) redirect("/board");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-md text-center">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-text-primary">
          Almost there
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
          Your account ({session.user.email}) is created, but new accounts
          need approval before you can use the board. You&apos;ll be able to
          sign in and pick up right where you left off once that happens.
        </p>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="rounded-md border border-border px-4 py-2 text-[15px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
