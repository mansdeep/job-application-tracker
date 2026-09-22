import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { themePreferenceSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireSession();
    const { theme } = themePreferenceSchema.parse(await request.json());

    await prisma.user.update({
      where: { id: userId },
      data: { themePreference: theme },
    });

    return NextResponse.json({ theme });
  } catch (error) {
    return toErrorResponse(error);
  }
}
