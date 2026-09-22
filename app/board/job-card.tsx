"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Job } from "@/lib/types";

function daysSince(dateString: string) {
  const days = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export function JobCard({
  job,
  onClick,
}: {
  job: Job;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: job.id, data: { status: job.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-grab rounded-md border border-border bg-surface-2 p-3 transition-colors active:cursor-grabbing hover:border-white/15"
    >
      <div className="text-[15px] font-medium text-text-primary">
        {job.role}
      </div>
      <div className="text-[14px] text-text-secondary">{job.company}</div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="font-mono text-[12px] tracking-[-0.01em] text-text-dim">
          {daysSince(job.createdAt)}
        </span>
        {job.prepKit && (
          <span className="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 font-mono text-[12px] tracking-[-0.01em] text-accent">
            kit ready
          </span>
        )}
      </div>
    </div>
  );
}
