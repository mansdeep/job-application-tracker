import { randomBytes } from "node:crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Reuses the VerificationToken table — it's otherwise unused now that
// magic-link sign-in is gone (see auth.ts).
export async function createPasswordResetToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  return token;
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = `${process.env.AUTH_URL}/reset-password/${token}`;
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Reset your Job Application Tracker password",
    text: `Reset your password: ${url}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
  });
}

/** Checks a token's validity without consuming it — safe to call when just
 * rendering the reset form. */
export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.expires < new Date()) return null;
  return record.identifier;
}

export async function deletePasswordResetToken(token: string): Promise<void> {
  await prisma.verificationToken.deleteMany({ where: { token } });
}
