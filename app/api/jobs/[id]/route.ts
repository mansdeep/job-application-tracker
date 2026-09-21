import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { updateJobSchema } from "@/lib/validation";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await requireSession();
    const { id } = await params;

    const job = await prisma.jobApplication.findFirst({
      where: { id, userId },
      include: { prepKit: true },
    });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ job });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await requireSession();
    const { id } = await params;
    const body = updateJobSchema.parse(await request.json());

    const result = await prisma.jobApplication.updateMany({
      where: { id, userId },
      data: body,
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const job = await prisma.jobApplication.findFirst({ where: { id, userId } });
    return NextResponse.json({ job });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await requireSession();
    const { id } = await params;

    const result = await prisma.jobApplication.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
