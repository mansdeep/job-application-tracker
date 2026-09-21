import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-errors";
import { scrapeRequestSchema } from "@/lib/validation";
import { isSafeScrapeUrl, scrapeJobUrl } from "@/lib/scrape";

// jsdom is Node-only, not Edge-compatible.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const { url } = scrapeRequestSchema.parse(await request.json());

    const parsed = new URL(url);
    if (!isSafeScrapeUrl(parsed)) {
      return NextResponse.json(
        { success: false, reason: "That URL can't be fetched" },
        { status: 400 },
      );
    }

    const result = await scrapeJobUrl(parsed);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
