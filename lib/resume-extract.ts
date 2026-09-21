import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export type ResumeFileType = "pdf" | "docx";

export function detectFileType(
  fileName: string,
  mimeType: string,
): ResumeFileType | null {
  const lower = fileName.toLowerCase();
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    return "docx";
  }
  return null;
}

export async function extractResumeText(
  buffer: Buffer,
  fileType: ResumeFileType,
): Promise<string> {
  if (fileType === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText({ pageJoiner: "" });
      return result.text.trim();
    } finally {
      await parser.destroy();
    }
  }

  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}
