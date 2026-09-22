import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Job Application Tracker",
  description: "Track job applications and generate tailored prep kits.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  let theme: "light" | "dark" = "light";
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { themePreference: true },
    });
    theme = user?.themePreference === "DARK" ? "dark" : "light";
  }

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas">{children}</body>
    </html>
  );
}
