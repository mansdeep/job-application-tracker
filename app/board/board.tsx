"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { STATUSES, type ApplicationStatus } from "@/lib/status";
import type { Job } from "@/lib/types";
import { Column } from "./column";
import { JobCard } from "./job-card";
import { AddJobModal } from "./add-job-modal";
import { JobDetail } from "../jobs/job-detail";

function groupByStatus(jobs: Job[]): Record<ApplicationStatus, Job[]> {
  const grouped = Object.fromEntries(
    STATUSES.map((s) => [s.value, [] as Job[]]),
  ) as Record<ApplicationStatus, Job[]>;
  for (const job of jobs) {
    grouped[job.status].push(job);
  }
  for (const key of Object.keys(grouped) as ApplicationStatus[]) {
    grouped[key].sort((a, b) => a.position - b.position);
  }
  return grouped;
}

export function Board({ initialJobs }: { initialJobs: Job[] }) {
  const [jobsByStatus, setJobsByStatus] = useState(() =>
    groupByStatus(initialJobs),
  );
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // closestCorners can resolve `over` back to the dragged card's own droppable
  // when hovering an empty column (its rect is still registered). Prefer a
  // literal pointer-in-rect test, falling back to bounding-box intersection,
  // and explicitly exclude the active item from candidates.
  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    const collisions =
      pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
    return collisions.filter((c) => c.id !== args.active.id);
  };

  function findContainer(id: string): ApplicationStatus | undefined {
    if (STATUSES.some((s) => s.value === id)) return id as ApplicationStatus;
    return (Object.keys(jobsByStatus) as ApplicationStatus[]).find((status) =>
      jobsByStatus[status].some((job) => job.id === id),
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const job = Object.values(jobsByStatus)
      .flat()
      .find((j) => j.id === event.active.id);
    setActiveJob(job ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(String(active.id));
    const overContainer = findContainer(String(over.id));
    if (
      !activeContainer ||
      !overContainer ||
      activeContainer === overContainer
    )
      return;

    setJobsByStatus((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((j) => j.id === active.id);
      if (activeIndex === -1) return prev;
      const moved = activeItems[activeIndex];
      const overIndex = overItems.findIndex((j) => j.id === over.id);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      const newOverItems = [...overItems];
      newOverItems.splice(insertAt, 0, { ...moved, status: overContainer });

      return {
        ...prev,
        [activeContainer]: activeItems.filter((j) => j.id !== active.id),
        [overContainer]: newOverItems,
      };
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveJob(null);
    if (!over) return;

    const destContainer = findContainer(String(over.id));
    if (!destContainer) return;

    // Authoritative move, computed from the current render's state directly
    // (not from a setState updater's `prev`, which runs asynchronously here
    // and can't be read back synchronously right after the call). Locates the
    // job in whichever container it's currently in — handleDragOver's live
    // preview may or may not have already relocated it — and places it into
    // destContainer.
    const next: Record<ApplicationStatus, Job[]> = { ...jobsByStatus };
    let movedJob: Job | undefined;
    for (const key of Object.keys(next) as ApplicationStatus[]) {
      const idx = next[key].findIndex((j) => j.id === active.id);
      if (idx !== -1) {
        movedJob = next[key][idx];
        next[key] = next[key].filter((j) => j.id !== active.id);
        break;
      }
    }
    if (!movedJob) return;

    const destItems = [...next[destContainer]];
    const overIndex = destItems.findIndex((j) => j.id === over.id);
    const insertAt = overIndex >= 0 ? overIndex : destItems.length;
    destItems.splice(insertAt, 0, { ...movedJob, status: destContainer });
    next[destContainer] = destItems;

    setJobsByStatus(next);

    await Promise.all(
      destItems.map((job, index) =>
        fetch(`/api/jobs/${job.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: destContainer, position: index }),
        }),
      ),
    );
  }

  function handleJobCreated(job: Job) {
    setJobsByStatus((prev) => ({
      ...prev,
      [job.status]: [...prev[job.status], job],
    }));
    setAddOpen(false);
  }

  function handleJobUpdated(job: Job) {
    setJobsByStatus((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next) as ApplicationStatus[]) {
        next[key] = next[key].filter((j) => j.id !== job.id);
      }
      next[job.status] = [...next[job.status], job].sort(
        (a, b) => a.position - b.position,
      );
      return next;
    });
    setSelectedJob(null);
  }

  function handleJobDeleted(jobId: string) {
    setJobsByStatus((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next) as ApplicationStatus[]) {
        next[key] = next[key].filter((j) => j.id !== jobId);
      }
      return next;
    });
    setSelectedJob(null);
  }

  return (
    <>
      <div className="flex items-center justify-between px-6 pt-4">
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Add job
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto p-6">
          {STATUSES.map((status) => (
            <Column
              key={status.value}
              status={status.value}
              label={status.label}
              jobs={jobsByStatus[status.value]}
              onJobClick={setSelectedJob}
            />
          ))}
        </div>
        <DragOverlay>
          {activeJob ? <JobCard job={activeJob} onClick={() => {}} /> : null}
        </DragOverlay>
      </DndContext>

      {addOpen && (
        <AddJobModal
          onClose={() => setAddOpen(false)}
          onCreated={handleJobCreated}
        />
      )}

      {selectedJob && (
        <JobDetail
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onUpdated={handleJobUpdated}
          onDeleted={handleJobDeleted}
        />
      )}
    </>
  );
}
