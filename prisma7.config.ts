import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations/introspection use DIRECT_URL (Neon's non-pooled connection in
// production; same as DATABASE_URL locally). The app's runtime PrismaClient
// connects separately via a driver adapter using DATABASE_URL — see lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
