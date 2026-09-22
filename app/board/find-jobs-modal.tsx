"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { Job } from "@/lib/types";

const fieldLabel = "text-[12px] font-medium tracking-[-0.01em] text-text-dim uppercase";
const fieldInput =
  "mt-1 w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[15px] text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

type SearchResult = {
  role: string;
  company: string;
  location: string;
  sourceUrl: string;
  description: string;
  whyGoodFit: string;
};

type ViewState =
  | { step: "form" }
  | { step: "searching" }
  | { step: "results"; results: SearchResult[] }
  | { step: "adding"; results: SearchResult[] };

export function FindJobsModal({
  onClose,
  onJobsCreated,
}: {
  onClose: () => void;
  onJobsCreated: (jobs: Job[]) => void;
}) {
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState(false);
  const [role, setRole] = useState("");
  const [view, setView] = useState<ViewState>({ step: "form" });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setView({ step: "searching" });
    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, location, remote, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Search failed. Please try again.");
      }
      const results: SearchResult[] = data.results ?? [];
      setSelected(new Set(results.map((_, i) => i)));
      setView({ step: "results", results });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed. Please try again.");
      setView({ step: "form" });
    }
  }

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleAddSelected() {
    if (view.step !== "results") return;
    const results = view.results;
    const toAdd = results.filter((_, i) => selected.has(i));
    if (toAdd.length === 0) return;

    setView({ step: "adding", results });
    setError(null);

    const settled = await Promise.allSettled(
      toAdd.map((r) =>
        fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: r.company,
            role: r.role,
            sourceUrl: r.sourceUrl,
            description: r.description,
          }),
        }).then(async (res) => {
          if (!res.ok) throw new Error("Failed to save");
          const data = await res.json();
          return data.job as Job;
        }),
      ),
    );

    const created = settled
      .filter((r): r is PromiseFulfilledResult<Job> => r.status === "fulfilled")
      .map((r) => r.value);
    const failedCount = settled.length - created.length;

    if (created.length > 0) onJobsCreated(created);

    if (failedCount > 0) {
      setError(
        `Added ${created.length} of ${toAdd.length} — ${failedCount} couldn't be saved. Please try again.`,
      );
      setView({ step: "results", results });
    } else {
      onClose();
    }
  }

  return (
    <Modal onClose={onClose} wide>
      <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-text-primary">
        Find jobs
      </h2>
      <p className="mt-1 text-[15px] text-text-secondary">
        Search the web for open roles matched against your resume.
      </p>

      {(view.step === "form" || view.step === "searching") && (
        <form onSubmit={handleSearch} className="mt-4 space-y-3">
          <div>
            <label className={fieldLabel}>Role</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className={fieldInput}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={fieldLabel}>Company</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Any"
                className={fieldInput}
              />
            </div>
            <div>
              <label className={fieldLabel}>City / State</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Any"
                className={fieldInput}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[15px] text-text-secondary">
            <input
              type="checkbox"
              checked={remote}
              onChange={(e) => setRemote(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-accent"
            />
            Include remote roles
          </label>

          {view.step === "searching" && (
            <p className="text-[13px] text-text-dim">
              Searching the web and checking fit against your resume — this
              can take a few minutes for a thorough search.
            </p>
          )}

          {error && <p className="text-[15px] text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1.5 text-[15px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={view.step === "searching"}
              className="rounded-md bg-accent px-3 py-1.5 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {view.step === "searching" ? "Searching…" : "Search"}
            </button>
          </div>
        </form>
      )}

      {(view.step === "results" || view.step === "adding") && (
        <div className="mt-4">
          {view.results.length === 0 ? (
            <p className="text-[15px] text-text-dim">
              No matching postings found. Try broadening your search.
            </p>
          ) : (
            <div className="space-y-2">
              {view.results.map((r, i) => (
                <label
                  key={i}
                  className="flex cursor-pointer gap-3 rounded-md border border-border bg-surface-1 p-3 transition-colors hover:border-text-dim"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => toggle(i)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-accent"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[15px] font-medium text-text-primary">
                        {r.role}
                      </span>
                      <span className="shrink-0 text-[13px] text-text-dim">{r.location}</span>
                    </div>
                    <div className="text-[14px] text-text-secondary">{r.company}</div>
                    <p className="mt-1 text-[13px] text-text-dim">{r.whyGoodFit}</p>
                    <a
                      href={r.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 inline-block text-[13px] text-accent hover:underline"
                    >
                      View posting ↗
                    </a>
                  </div>
                </label>
              ))}
            </div>
          )}

          {error && <p className="mt-3 text-[15px] text-danger">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setView({ step: "form" })}
              className="rounded-md border border-border px-3 py-1.5 text-[15px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
            >
              Search again
            </button>
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={view.step === "adding" || selected.size === 0}
              className="rounded-md bg-accent px-3 py-1.5 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {view.step === "adding"
                ? "Adding…"
                : `Add ${selected.size} selected`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
