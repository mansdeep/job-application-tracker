import { auth } from "@/auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** Returns the current session's user id, or throws UnauthorizedError if signed out. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return { userId: session.user.id, session };
}
