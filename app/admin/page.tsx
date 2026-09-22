import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { requireSession, UnapprovedError } from "@/lib/auth";
import { isAdminEmail, adminEmails } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { UserList } from "./user-list";

export default async function AdminPage() {
  const session = await auth();
  try {
    await requireSession();
  } catch (error) {
    if (error instanceof UnapprovedError) redirect("/pending");
    throw error;
  }
  if (!isAdminEmail(session?.user?.email)) redirect("/board");

  const users = await prisma.user.findMany({
    where: { email: { notIn: adminEmails() } },
    select: { id: true, email: true, isApproved: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const pending = users.filter((u) => !u.isApproved);
  const approved = users.filter((u) => u.isApproved);

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
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-text-primary">
          User approval
        </h2>
        <p className="mt-1 text-[14px] text-text-secondary">
          Approve new sign-ups before they can use the board, or revoke an
          approved user's access.
        </p>

        <UserList
          initialPending={pending.map((u) => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
          }))}
          initialApproved={approved.map((u) => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
