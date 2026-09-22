import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { requireSession, UnapprovedError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResumeForm } from "./resume-form";
import { ThemeToggle } from "./theme-toggle";

export default async function ProfilePage() {
  const session = await auth();
  let userId: string;
  try {
    ({ userId } = await requireSession());
  } catch (error) {
    if (error instanceof UnapprovedError) redirect("/pending");
    throw error;
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      resumeText: true,
      resumeFileName: true,
      resumeFileType: true,
      resumeUpdatedAt: true,
      themePreference: true,
    },
  });

  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-text-primary">
            Job Application Tracker
          </h1>
          <Link
            href="/board"
            className="text-[14px] text-text-secondary transition-colors hover:text-text-primary"
          >
            ← Board
          </Link>
        </div>
        <div className="flex items-center gap-4 text-[14px] text-text-secondary">
          <span>{session?.user?.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-md px-2 py-1 transition-colors hover:bg-surface-3 hover:text-text-primary"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto w-full max-w-xl px-6 py-8">
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-text-primary">
          Base resume
        </h2>
        <p className="mt-1 text-[14px] text-text-secondary">
          Uploaded once, reused every time you generate a Preparation Kit for
          a job.
        </p>

        <div className="mt-4">
          <ResumeForm
            initial={{
              resumeText: user.resumeText,
              resumeFileName: user.resumeFileName,
              resumeFileType: user.resumeFileType,
              resumeUpdatedAt: user.resumeUpdatedAt?.toISOString() ?? null,
            }}
          />
        </div>

        <h2 className="mt-8 text-[18px] font-semibold tracking-[-0.02em] text-text-primary">
          Appearance
        </h2>
        <p className="mt-1 text-[14px] text-text-secondary">
          Choose how the app looks. Saved to your account.
        </p>
        <div className="mt-4 max-w-xs">
          <ThemeToggle initial={user.themePreference} />
        </div>
      </div>
    </main>
  );
}
