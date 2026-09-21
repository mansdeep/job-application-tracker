import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe config: no adapter, no Node-only providers. Used directly by
 * middleware.ts (which runs on the Edge runtime and can't load the Prisma
 * client), and spread into the full config in auth.ts.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login", verifyRequest: "/login/verify" },
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
