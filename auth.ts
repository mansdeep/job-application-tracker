import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import { authConfig } from "@/auth.config";
import { notifyAdminsOfNewUser } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email;
      const password = credentials?.password;
      if (typeof email !== "string" || typeof password !== "string") return null;

      const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      // No account, or an account that only ever signed in via Google (no
      // password set) — same generic failure either way, don't leak which.
      if (!user?.passwordHash) return null;

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) return null;

      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  }),
];

// Only offer Google if it's actually configured — an unconfigured provider
// would otherwise show a "Continue with Google" button that fails on click.
export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
if (googleEnabled) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers,
  events: {
    // Fires once, the first time a given email signs in via Google — the
    // PrismaAdapter just created the User row (Credentials accounts are
    // instead created explicitly in app/register/page.tsx, which calls
    // notifyAdminsOfNewUser itself). New non-admin sign-ups start unapproved
    // (see User.isApproved in prisma/schema.prisma) — email the admins so
    // they know to go approve it, since nothing else would tell them.
    async createUser({ user }) {
      if (user.email) await notifyAdminsOfNewUser(user.email);
    },
  },
});
