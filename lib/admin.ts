/**
 * No dependency on lib/auth.ts or auth.ts on purpose — auth.ts (NextAuth
 * config) needs isAdminEmail for its createUser event, and lib/auth.ts
 * needs it for requireSession/requireAdmin, so this has to live somewhere
 * both can import without a circular dependency (auth.ts -> lib/auth.ts ->
 * auth.ts).
 */

/** Emails in ADMIN_EMAILS (comma-separated) are always treated as approved
 * and can access /admin — regardless of their User.isApproved DB value. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails()
    .map((e) => e.toLowerCase())
    .includes(email.toLowerCase());
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}
