import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { createJobSchema } from "@/lib/validation";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const jobs = await prisma.jobApplication.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { position: "asc" }],
      include: { prepKit: { select: { id: true } } },
    });
    return NextResponse.json({ jobs });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSession();
    const body = createJobSchema.parse(await request.json());

    const status = body.status ?? "WISHLIST";
    const last = await prisma.jobApplication.findFirst({
      where: { userId, status },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const job = await prisma.jobApplication.create({
      data: {
        userId,
        company: body.company,
        role: body.role,
        sourceUrl: body.sourceUrl,
        description: body.description,
        status,
        position: (last?.position ?? -1) + 1,
      },
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
