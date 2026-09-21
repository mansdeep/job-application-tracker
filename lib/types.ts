import type { ApplicationStatus } from "@/lib/status";

export type Job = {
  id: string;
  company: string;
  role: string;
  sourceUrl: string | null;
  description: string;
  notes: string | null;
  status: ApplicationStatus;
  position: number;
  createdAt: string;
  updatedAt: string;
  prepKit: { id: string } | null;
};
