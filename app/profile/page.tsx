import Link from "next/link";
import { auth, signOut } from "@/auth";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResumeForm } from "./resume-form";

export default async function ProfilePage() {
  const session = await auth();
  const { userId } = await requireSession();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      resumeText: true,
      resumeFileName: true,
      resumeFileType: true,
      resumeUpdatedAt: true,
    },
  });

  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-[13px] font-semibold tracking-[-0.02em] text-text-primary">
            Job Application Tracker
          </h1>
          <Link
            href="/board"
            className="text-[13px] text-text-secondary transition-colors hover:text-text-primary"
          >
            ← Board
          </Link>
        </div>
        <div className="flex items-center gap-4 text-[13px] text-text-secondary">
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
        <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-text-primary">
          Base resume
        </h2>
        <p className="mt-1 text-[13px] text-text-secondary">
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
      </div>
    </main>
  );
}
