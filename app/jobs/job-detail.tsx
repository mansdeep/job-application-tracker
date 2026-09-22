"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CharCount } from "@/components/ui/char-count";
import { STATUSES } from "@/lib/status";
import { LIMITS } from "@/lib/limits";
import type { Job, PrepKitData } from "@/lib/types";
import { PrepKitPanel } from "./prepkit-panel";

export function JobDetail({
  job,
  onClose,
  onUpdated,
  onDeleted,
  onPrepKitChange,
}: {
  job: Job;
  onClose: () => void;
  onUpdated: (job: Job) => void;
  onDeleted: (jobId: string) => void;
  onPrepKitChange: (jobId: string, hasKit: boolean) => void;
}) {
  const [description, setDescription] = useState(job.description);
  const [editingDescription, setEditingDescription] = useState(false);
  const [notes, setNotes] = useState(job.notes ?? "");
  const [status, setStatus] = useState(job.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [kitGenerating, setKitGenerating] = useState(false);

  const [prepKit, setPrepKit] = useState<PrepKitData | null>(null);
  const [resumeMissing, setResumeMissing] = useState(false);
  const [loadingKit, setLoadingKit] = useState(true);

  const dirty =
    notes !== (job.notes ?? "") || status !== job.status || description !== job.description;

  useEffect(() => {
    if (!kitGenerating) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [kitGenerating]);

  function handleRequestClose() {
    if (
      kitGenerating &&
      !window.confirm(
        "A Preparation Kit is still being generated. Closing now won't stop it, but you'll need to reopen this job to see the result. Close anyway?",
      )
    ) {
      return;
    }
    onClose();
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [jobRes, resumeRes] = await Promise.all([
          fetch(`/api/jobs/${job.id}`),
          fetch("/api/profile/resume"),
        ]);
        const jobData = await jobRes.json();
        const resumeData = await resumeRes.json();
        if (cancelled) return;
        setPrepKit(jobData.job?.prepKit ?? null);
        setResumeMissing(!resumeData.resume?.resumeText);
      } finally {
        if (!cancelled) setLoadingKit(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [job.id]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || null, status, description }),
      });
      if (res.ok) {
        const { job: updated } = await res.json();
        onUpdated(updated);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      if (res.ok) onDeleted(job.id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <Modal onClose={handleRequestClose} wide>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-text-primary">
              {job.role}
            </h2>
            <p className="text-[15px] text-text-secondary">{job.company}</p>
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="rounded-md border border-border bg-surface-1 px-2 py-1 text-[15px] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {job.sourceUrl && (
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-[15px] text-accent hover:underline"
          >
            View original posting ↗
          </a>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-medium uppercase tracking-[-0.01em] text-text-dim">
              Job description
            </h3>
            {editingDescription ? (
              <button
                onClick={() => {
                  setDescription(job.description);
                  setEditingDescription(false);
                }}
                className="text-[13px] text-text-secondary transition-colors hover:text-text-primary"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={() => setEditingDescription(true)}
                className="text-[13px] text-text-secondary transition-colors hover:text-text-primary"
              >
                Edit
              </button>
            )}
          </div>
          {editingDescription ? (
            <>
              <textarea
                rows={8}
                maxLength={LIMITS.jobDescription}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[15px] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <div className="mt-1 flex justify-end">
                <CharCount length={description.length} max={LIMITS.jobDescription} />
              </div>
            </>
          ) : (
            <div className="mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-surface-1 p-3 text-[15px] text-text-secondary">
              {description}
            </div>
          )}
        </div>

        <div className="mt-4">
          <h3 className="text-[12px] font-medium uppercase tracking-[-0.01em] text-text-dim">
            Notes
          </h3>
          <textarea
            rows={3}
            maxLength={LIMITS.jobNotes}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note…"
            className="mt-1 w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[15px] text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <div className="mt-1 flex justify-end">
            <CharCount length={notes.length} max={LIMITS.jobNotes} />
          </div>
        </div>

        {!loadingKit && (
          <PrepKitPanel
            jobId={job.id}
            initialPrepKit={prepKit}
            resumeMissing={resumeMissing}
            onKitChange={(hasKit) => onPrepKitChange(job.id, hasKit)}
            onGeneratingChange={setKitGenerating}
          />
        )}

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-[15px] text-danger hover:underline"
          >
            Delete job
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleRequestClose}
              className="rounded-md border border-border px-3 py-1.5 text-[15px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="rounded-md bg-accent px-3 py-1.5 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </Modal>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this job?"
          description="This removes the card and any generated prep kit. This can't be undone."
          confirmLabel={deleting ? "Deleting…" : "Delete"}
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
