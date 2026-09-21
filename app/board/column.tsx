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
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-gray-100">
      <div className="flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700">
        <span>{label}</span>
        <span className="text-xs text-gray-400">{jobs.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className="flex min-h-[4rem] flex-1 flex-col gap-2 px-3 pb-3"
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
