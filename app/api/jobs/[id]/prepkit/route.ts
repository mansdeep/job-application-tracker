import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { requireSession } from "@/lib/auth";
import { toErrorResponse, toAnthropicErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { generatePrepKit, PREPKIT_DEADLINE_MS } from "@/lib/anthropic";
import { updatePrepKitSchema } from "@/lib/validation";

// generatePrepKit hard-caps itself at PREPKIT_DEADLINE_MS (3 minutes, see
// lib/anthropic.ts) — this must stay comfortably above that. In practice
// generation finishes in well under a minute; this is just the outer bound.
// Only honored on hosts that allow it: Vercel's Hobby/free tier hard-caps
// every function at 60s regardless of this value. Works without limitation
// locally.
export const maxDuration = 200;

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await requireSession();
    const { id } = await params;

    const job = await prisma.jobApplication.findFirst({
      where: { id, userId },
      include: { prepKit: { select: { id: true } } },
    });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (job.prepKit) {
      return NextResponse.json(
        { error: "A prep kit already exists for this job. Delete it first to regenerate." },
        { status: 409 },
      );
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { resumeText: true },
    });
    if (!user.resumeText) {
      return NextResponse.json(
        { error: "Upload your base resume in your profile before generating a prep kit." },
        { status: 400 },
      );
    }

    let content;
    try {
      content = await generatePrepKit({
        company: job.company,
        role: job.role,
        jobDescription: job.description,
        resumeText: user.resumeText,
        notes: job.notes ?? undefined,
      });
    } catch (err) {
      const mapped = toAnthropicErrorResponse(err, "[prepkit]");
      if (mapped) return mapped;
      throw err;
    }

    // Only ever create a PrepKit row from a fully validated result, so "a kit
    // exists" always means "a complete kit exists" for the 409 check above.
    // The unique constraint on jobApplicationId is a safety net against a
    // concurrent request racing past the check above. resumeGaps/
    // resumeAdditions live on this same row (not JobApplication.notes) so
    // that deleting the kit deletes these findings too, via the cascade.
    try {
      const prepKit = await prisma.prepKit.create({
        data: {
          jobApplicationId: id,
          coverLetter: content.coverLetter,
          rewrittenResume: content.rewrittenResume,
          interviewQuestions: content.interviewQuestions,
          companyBrief: content.companyBrief,
          resumeGaps: content.resumeGaps,
          resumeAdditions: content.resumeAdditions,
        },
      });

      return NextResponse.json({ prepKit }, { status: 201 });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "A prep kit already exists for this job. Delete it first to regenerate." },
          { status: 409 },
        );
      }
      throw err;
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await requireSession();
    const { id } = await params;
    const body = updatePrepKitSchema.parse(await request.json());

    const job = await prisma.jobApplication.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const result = await prisma.prepKit.updateMany({
      where: { jobApplicationId: id },
      data: body,
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "No prep kit exists for this job" }, { status: 404 });
    }

    const prepKit = await prisma.prepKit.findUnique({ where: { jobApplicationId: id } });
    return NextResponse.json({ prepKit });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await requireSession();
    const { id } = await params;

    const job = await prisma.jobApplication.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.prepKit.deleteMany({ where: { jobApplicationId: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
