import { Resend } from "resend";
import { adminEmails, isAdminEmail } from "@/lib/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

/** Emails the admins that a new (non-admin) account signed up and is
 * pending approval. Never throws — a failed notification shouldn't block
 * the sign-up itself. */
export async function notifyAdminsOfNewUser(email: string): Promise<void> {
  const admins = adminEmails();
  if (admins.length === 0 || isAdminEmail(email)) return;

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: admins,
      subject: "New Job Application Tracker sign-up pending approval",
      text: `${email} just signed up and is waiting for approval.\n\nApprove or reject: ${process.env.AUTH_URL}/admin`,
    });
  } catch (err) {
    console.error("[notify] failed to send new-user notification", err);
  }
}
