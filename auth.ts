import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import ResendProvider from "next-auth/providers/resend";
import { Resend } from "resend";
import { authConfig } from "@/auth.config";
import { isAdminEmail, adminEmails } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// A separate client from the ResendProvider below — that one only sends the
// magic-link email itself, this one sends the admin notification.
const resend = new Resend(process.env.RESEND_API_KEY);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ResendProvider({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
    }),
  ],
  events: {
    // Fires once, the first time a given email signs in (PrismaAdapter just
    // created the User row). New non-admin sign-ups start unapproved (see
    // User.isApproved in prisma/schema.prisma) — email the admins so they
    // know to go approve it, since nothing else would tell them.
    async createUser({ user }) {
      const admins = adminEmails();
      if (admins.length === 0 || isAdminEmail(user.email)) return;

      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: admins,
          subject: "New Job Application Tracker sign-up pending approval",
          text: `${user.email} just signed up and is waiting for approval.\n\nApprove or reject: ${process.env.AUTH_URL}/admin`,
        });
      } catch (err) {
        // A failed notification email shouldn't block the sign-up itself.
        console.error("[auth] failed to send new-user notification", err);
      }
    },
  },
});
