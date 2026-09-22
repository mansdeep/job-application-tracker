import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { toErrorResponse, toAnthropicErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { searchJobs } from "@/lib/anthropic";
import { jobSearchRequestSchema } from "@/lib/validation";

// searchJobs hard-caps its own web-search phase at 3 minutes (see
// SEARCH_DEADLINE_MS in lib/anthropic.ts), plus a fast ~30s extraction pass
// after — this must stay comfortably above that combined budget. Only
// honored on hosts that allow it: Vercel's Hobby/free tier hard-caps every
// function at 60s regardless of this value, so this feature needs at least
// a Pro plan to run reliably once deployed. Works without limitation locally.
export const maxDuration = 220;

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
