"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Job } from "@/lib/types";
import type { ApplicationStatus } from "@/lib/status";
import { JobCard } from "./job-card";

export function Column({
  status,
  label,
  jobs,
  onJobClick,
}: {
  status: ApplicationStatus;
  label: string;
  jobs: Job[];
  onJobClick: (job: Job) => void;
}) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div className="flex w-72 shrink-0 flex-col border-r border-border last:border-r-0">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[14px] font-medium text-text-secondary">
          {label}
        </span>
        <span className="font-mono text-[12px] text-text-dim">
          {jobs.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="flex min-h-16 flex-1 flex-col gap-2 px-3 pb-3"
      >
        <SortableContext
          items={jobs.map((j) => j.id)}
          strategy={verticalListSortingStrategy}
        >
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onClick={() => onJobClick(job)} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
