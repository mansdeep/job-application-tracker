import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { requireSession } from "@/lib/auth";
import { toErrorResponse, toAnthropicErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { generatePrepKit } from "@/lib/anthropic";

// A single generation call can take a while to produce four full documents.
export const maxDuration = 60;

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
      });
    } catch (err) {
      const mapped = toAnthropicErrorResponse(err, "[prepkit]");
      if (mapped) return mapped;
      throw err;
    }

    // Only ever create a PrepKit row from a fully validated result, so "a kit
    // exists" always means "a complete kit exists" for the 409 check above.
    // The unique constraint on jobApplicationId is a safety net against a
    // concurrent request racing past the check above.
    try {
      const prepKit = await prisma.prepKit.create({
        data: {
          jobApplicationId: id,
          coverLetter: content.coverLetter,
          rewrittenResume: content.rewrittenResume,
          interviewQuestions: content.interviewQuestions,
          companyBrief: content.companyBrief,
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
