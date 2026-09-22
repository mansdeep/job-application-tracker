import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { updateUserApprovalSchema } from "@/lib/validation";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { isApproved } = updateUserApprovalSchema.parse(await request.json());

    const result = await prisma.user.updateMany({
      where: { id },
      data: { isApproved },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

// Rejects a pending sign-up by deleting the account outright — there's no
// separate "rejected" state, so this is how a pending request goes away.
// Cascades to their JobApplications/PrepKits/Accounts/Sessions via the
// existing onDelete: Cascade relations.
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: adminId } = await requireAdmin();
    const { id } = await params;
    if (id === adminId) {
      return NextResponse.json(
        { error: "You can't remove your own account here." },
        { status: 400 },
      );
    }

    const result = await prisma.user.deleteMany({ where: { id } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
