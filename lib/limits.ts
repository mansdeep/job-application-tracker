/**
 * Character limits shown as used/limit counters next to editable text boxes
 * across the app. Kept in one place so the UI counters and the backend
 * validation in lib/validation.ts can't drift out of sync.
 */
export const LIMITS = {
  jobDescription: 10_000,
  jobNotes: 5_000,
  coverLetter: 20_000,
  rewrittenResume: 20_000,
  companyBrief: 20_000,
  // These two are arrays server-side (one bullet per array item), so the
  // limit below is only enforced client-side on the joined textarea — it
  // caps how much a user can type in one edit, not a hard per-item rule.
  interviewQuestionsBlock: 6_000,
  resumeGapsBlock: 3_000,
  resumeAdditionsBlock: 3_000,
} as const;
