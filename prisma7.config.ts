import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations/introspection use DIRECT_URL (Neon's non-pooled connection in
// production; same as DATABASE_URL locally). The app's runtime PrismaClient
// connects separately via a driver adapter using DATABASE_URL — see lib/prisma.ts.
// Falls back to DATABASE_URL_UNPOOLED, which is what Vercel's native Neon
// storage integration actually names the unpooled connection string (it
// doesn't create a DIRECT_URL variable itself) — set DIRECT_URL explicitly
// if you want to be independent of that naming.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL_UNPOOLED"],
  },
});
