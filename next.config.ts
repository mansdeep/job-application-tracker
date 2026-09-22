import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse is pinned to v1 specifically (see lib/resume-extract.ts) — v2
  // wraps the full pdfjs-dist rendering engine, which references browser-only
  // globals like DOMMatrix at module-load time and crashed with
  // "ReferenceError: DOMMatrix is not defined" when deployed to Vercel, even
  // though it worked locally. v1 is a much older, simpler text-only parser
  // with no such dependency.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
