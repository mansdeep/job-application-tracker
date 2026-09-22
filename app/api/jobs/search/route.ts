import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { toErrorResponse, toAnthropicErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { searchJobs } from "@/lib/anthropic";
import { jobSearchRequestSchema } from "@/lib/validation";

// Multi-round web search is genuinely slow (measured 90s-250s+ for a real
// search). This route's maxDuration is only honored on hosts that allow it —
// Vercel's Hobby/free tier hard-caps every function at 60s regardless of
// this value, so this feature needs at least a Pro plan to run reliably
// once deployed. Works without limitation for local dev.
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSession();
    const criteria = jobSearchRequestSchema.parse(await request.json());

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { resumeText: true },
    });
    if (!user.resumeText) {
      return NextResponse.json(
        { error: "Upload your base resume in your profile before searching for jobs." },
        { status: 400 },
      );
    }

    let results;
    try {
      results = await searchJobs({ ...criteria, resumeText: user.resumeText });
    } catch (err) {
      const mapped = toAnthropicErrorResponse(err, "[job-search]");
      if (mapped) return mapped;
      throw err;
    }

    return NextResponse.json(results);
  } catch (error) {
    return toErrorResponse(error);
  }
}
