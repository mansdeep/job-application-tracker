import { z } from "zod";

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
  description: z.string().trim().min(1),
  status: z.enum(STATUS_VALUES).optional(),
});

export const updateJobSchema = z.object({
  company: z.string().trim().min(1).max(200).optional(),
  role: z.string().trim().min(1).max(200).optional(),
  sourceUrl: z.string().trim().url().max(2000).nullable().optional(),
  description: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
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
