import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf.js resolves its worker script relative to its own module location at
  // runtime; letting the bundler inline/relocate it into a chunk breaks that
  // lookup. Keep it (and pdf-parse) as a real, unbundled node_modules import.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
