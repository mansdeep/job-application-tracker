import pdfParse from "pdf-parse";
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
    const result = await pdfParse(buffer);
    return result.text.trim();
  }

  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}
