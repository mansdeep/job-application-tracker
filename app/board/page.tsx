import Link from "next/link";
import { auth, signOut } from "@/auth";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Board } from "./board";

export default async function BoardPage() {
  const session = await auth();
  const { userId } = await requireSession();

  const jobs = await prisma.jobApplication.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { position: "asc" }],
    include: { prepKit: { select: { id: true } } },
  });

  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <h1 className="text-[13px] font-semibold tracking-[-0.02em] text-text-primary">
          Job Application Tracker
        </h1>
        <div className="flex items-center gap-4 text-[13px] text-text-secondary">
          <Link
            href="/profile"
            className="transition-colors hover:text-text-primary"
          >
            Profile
          </Link>
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

      <Board
        initialJobs={jobs.map((job) => ({
          ...job,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
        }))}
      />
    </main>
  );
}
