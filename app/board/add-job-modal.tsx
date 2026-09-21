"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { Job } from "@/lib/types";

const fieldLabel = "text-[11px] font-medium tracking-[-0.01em] text-text-dim uppercase";
const fieldInput =
  "mt-1 w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none";

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success" }
  | { status: "failed"; reason: string };

export function AddJobModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (job: Job) => void;
}) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });

  async function handleFetchDetails() {
    if (!sourceUrl) return;
    setFetchState({ status: "loading" });
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFetchState({
          status: "failed",
          reason:
            data?.reason ??
            "We couldn't pull the details automatically. Please fill them in below.",
        });
        return;
      }
      if (data.company) setCompany(data.company);
      if (data.role) setRole(data.role);
      if (data.description) setDescription(data.description);
      setFetchState({ status: "success" });
    } catch {
      setFetchState({
        status: "failed",
        reason: "We couldn't reach that URL. Please fill in the details below.",
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, role, sourceUrl, description }),
      });
      if (!res.ok) {
        throw new Error("Couldn't save this job. Please check the fields and try again.");
      }
      const { job } = await res.json();
      onCreated(job);
    } catch {
      setError("Couldn't save this job. Please check the fields and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} wide>
      <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-text-primary">
        Add a job
      </h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Paste a job posting URL to auto-fill the details, or fill them in yourself.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label className={fieldLabel}>Job posting URL (optional)</label>
          <div className="mt-1 flex gap-2">
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => {
                setSourceUrl(e.target.value);
                if (fetchState.status !== "idle") setFetchState({ status: "idle" });
              }}
              placeholder="https://"
              className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={handleFetchDetails}
              disabled={!sourceUrl || fetchState.status === "loading"}
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-[13px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary disabled:opacity-40"
            >
              {fetchState.status === "loading" ? "Fetching…" : "Fetch details"}
            </button>
          </div>
          {fetchState.status === "success" && (
            <p className="mt-1.5 text-[12px] text-accent">
              We pulled this automatically — please check it looks right below.
            </p>
          )}
          {fetchState.status === "failed" && (
            <p className="mt-1.5 text-[12px] text-text-dim">{fetchState.reason}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>Company</label>
            <input
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={fieldInput}
            />
          </div>
          <div>
            <label className={fieldLabel}>Role</label>
            <input
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={fieldInput}
            />
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Job description</label>
          <textarea
            required
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={fieldInput}
          />
        </div>

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-[13px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add job"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
