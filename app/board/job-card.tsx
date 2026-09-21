"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Job } from "@/lib/types";

function daysSince(dateString: string) {
  const days = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
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
      className="cursor-grab rounded-md border border-gray-200 bg-white p-3 shadow-sm active:cursor-grabbing hover:border-gray-300"
    >
      <div className="text-sm font-medium text-gray-900">{job.role}</div>
      <div className="text-sm text-gray-600">{job.company}</div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>Added {daysSince(job.createdAt)}</span>
        {job.prepKit && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
            Kit ready
          </span>
        )}
      </div>
    </div>
  );
}
