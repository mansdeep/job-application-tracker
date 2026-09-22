import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export { isAdminEmail };

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** Thrown when a signed-in user's account is pending admin approval. */
export class UnapprovedError extends Error {
  constructor() {
    super("Account pending approval");
    this.name = "UnapprovedError";
  }
}

/**
 * Returns the current session's user id, or throws UnauthorizedError if
 * signed out, or UnapprovedError if signed in but not yet approved by an
 * admin. Every current caller (every API route, plus the board/profile
 * pages) needs both checks, so they're folded into one function rather than
 * requiring every call site to remember a second gate.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  if (!isAdminEmail(session.user.email)) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isApproved: true },
    });
    if (!user?.isApproved) {
      throw new UnapprovedError();
    }
  }
  return { userId: session.user.id, session };
}

/** Like requireSession, but also throws UnauthorizedError if the signed-in
 * user isn't one of the ADMIN_EMAILS. Use for /admin pages and routes. */
export async function requireAdmin() {
  const { userId, session } = await requireSession();
  if (!isAdminEmail(session.user.email)) {
    throw new UnauthorizedError();
  }
  return { userId, session };
}
