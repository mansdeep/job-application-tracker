import { z } from "zod";
import { LIMITS } from "@/lib/limits";

const STATUS_VALUES = [
  "WISHLIST",
  "APPLIED",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
] as const;

export const createJobSchema = z.object({
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  sourceUrl: z
    .string()
    .trim()
    .url()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  description: z.string().trim().min(1).max(LIMITS.jobDescription),
  status: z.enum(STATUS_VALUES).optional(),
});

export const updateJobSchema = z.object({
  company: z.string().trim().min(1).max(200).optional(),
  role: z.string().trim().min(1).max(200).optional(),
  sourceUrl: z.string().trim().url().max(2000).nullable().optional(),
  description: z.string().trim().min(1).max(LIMITS.jobDescription).optional(),
  notes: z.string().trim().max(LIMITS.jobNotes).nullable().optional(),
  status: z.enum(STATUS_VALUES).optional(),
  position: z.number().int().min(0).optional(),
});

export const scrapeRequestSchema = z.object({
  url: z.string().trim().url().max(2000),
});

export const resumeTextSchema = z.object({
  text: z.string().trim().min(1).max(50_000),
});

export const themePreferenceSchema = z.object({
  theme: z.enum(["LIGHT", "DARK"]),
});

export const updatePrepKitSchema = z
  .object({
    coverLetter: z.string().trim().min(1).max(LIMITS.coverLetter).optional(),
    rewrittenResume: z.string().trim().min(1).max(LIMITS.rewrittenResume).optional(),
    interviewQuestions: z
      .array(z.string().trim().min(1))
      .min(1)
      .max(20)
      .optional(),
    companyBrief: z.string().trim().min(1).max(LIMITS.companyBrief).optional(),
    resumeGaps: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
    resumeAdditions: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
  })
  .refine(
    (v) =>
      v.coverLetter ||
      v.rewrittenResume ||
      v.interviewQuestions ||
      v.companyBrief ||
      v.resumeGaps ||
      v.resumeAdditions,
    "Nothing to update",
  );

export const jobSearchRequestSchema = z
  .object({
    company: z.string().trim().max(200).optional(),
    location: z.string().trim().max(200).optional(),
    remote: z.boolean().optional(),
    role: z.string().trim().max(200).optional(),
  })
  .refine(
    (v) => v.company || v.location || v.remote || v.role,
    "Enter at least one search term",
  );
