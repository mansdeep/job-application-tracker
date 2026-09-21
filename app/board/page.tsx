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
    <main className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">Job Application Tracker</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{session?.user?.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="hover:text-gray-900">
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
