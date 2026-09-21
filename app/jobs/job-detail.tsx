"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { STATUSES } from "@/lib/status";
import type { Job } from "@/lib/types";

export function JobDetail({
  job,
  onClose,
  onUpdated,
  onDeleted,
}: {
  job: Job;
  onClose: () => void;
  onUpdated: (job: Job) => void;
  onDeleted: (jobId: string) => void;
}) {
  const [notes, setNotes] = useState(job.notes ?? "");
  const [status, setStatus] = useState(job.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty = notes !== (job.notes ?? "") || status !== job.status;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || null, status }),
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
      <Modal onClose={onClose} wide>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-text-primary">
              {job.role}
            </h2>
            <p className="text-[13px] text-text-secondary">{job.company}</p>
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="rounded-md border border-border bg-surface-1 px-2 py-1 text-[13px] text-text-primary focus:border-accent focus:outline-none"
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
            className="mt-2 inline-block text-[13px] text-accent hover:underline"
          >
            View original posting ↗
          </a>
        )}

        <div className="mt-4">
          <h3 className="text-[11px] font-medium uppercase tracking-[-0.01em] text-text-dim">
            Job description
          </h3>
          <div className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-surface-1 p-3 text-[13px] text-text-secondary">
            {job.description}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-[11px] font-medium uppercase tracking-[-0.01em] text-text-dim">
            Notes
          </h3>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note…"
            className="mt-1 w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none"
          />
        </div>

        <div className="mt-4 rounded-md border border-dashed border-border p-4 text-center text-[13px] text-text-dim">
          Preparation Kit generation coming soon
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-[13px] text-danger hover:underline"
          >
            Delete job
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1.5 text-[13px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
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
