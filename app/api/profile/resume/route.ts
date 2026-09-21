import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { resumeTextSchema } from "@/lib/validation";
import { detectFileType, extractResumeText } from "@/lib/resume-extract";

// pdf-parse/mammoth are Node-only, not Edge-compatible.
export const runtime = "nodejs";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export async function GET() {
  try {
    const { userId } = await requireSession();
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        resumeText: true,
        resumeFileName: true,
        resumeFileType: true,
        resumeUpdatedAt: true,
      },
    });
    return NextResponse.json({ resume: user });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSession();
    const contentType = request.headers.get("content-type") ?? "";

    let resumeText: string;
    let resumeFileName: string | null = null;
    let resumeFileType: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "File is too large (max 5MB)" },
          { status: 400 },
        );
      }
      const fileType = detectFileType(file.name, file.type);
      if (!fileType) {
        return NextResponse.json(
          { error: "Please upload a PDF or .docx file" },
          { status: 400 },
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      let extracted: string;
      try {
        extracted = await extractResumeText(buffer, fileType);
      } catch (err) {
        console.error("[resume-extract]", err);
        extracted = "";
      }
      if (!extracted) {
        return NextResponse.json(
          {
            error:
              "Couldn't read any text from that file. Try pasting your resume as text instead.",
          },
          { status: 422 },
        );
      }
      resumeText = extracted;
      resumeFileName = file.name;
      resumeFileType = fileType;
    } else {
      const body = resumeTextSchema.parse(await request.json());
      resumeText = body.text;
      resumeFileType = "text";
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        resumeText,
        resumeFileName,
        resumeFileType,
        resumeUpdatedAt: new Date(),
      },
      select: {
        resumeText: true,
        resumeFileName: true,
        resumeFileType: true,
        resumeUpdatedAt: true,
      },
    });

    return NextResponse.json({ resume: user });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE() {
  try {
    const { userId } = await requireSession();
    await prisma.user.update({
      where: { id: userId },
      data: {
        resumeText: null,
        resumeFileName: null,
        resumeFileType: null,
        resumeUpdatedAt: null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
