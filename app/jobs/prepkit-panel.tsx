"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { downloadTextAsPdf } from "@/lib/pdf-export";
import type { PrepKitData } from "@/lib/types";

const sectionLabel =
  "text-[12px] font-medium uppercase tracking-[-0.01em] text-text-dim";

function Section({
  title,
  body,
  filename,
  documentStyle = false,
}: {
  title: string;
  body: string;
  filename: string;
  /** True for content meant to look like a real, sendable document (a
   * resume, a cover letter) — the downloaded PDF omits our own section
   * label as a heading so it just looks like the document itself. */
  documentStyle?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-md border border-border bg-surface-1 p-3">
      <div className="flex items-center justify-between">
        <h4 className={sectionLabel}>{title}</h4>
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="text-[13px] text-text-secondary transition-colors hover:text-text-primary"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={() =>
              downloadTextAsPdf(body, filename, documentStyle ? undefined : title)
            }
            className="text-[13px] text-text-secondary transition-colors hover:text-text-primary"
          >
            Download
          </button>
        </div>
      </div>
      <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-[15px] text-text-secondary">
        {body}
      </p>
    </div>
  );
}

export function PrepKitPanel({
  jobId,
  initialPrepKit,
  resumeMissing,
  onKitChange,
}: {
  jobId: string;
  initialPrepKit: PrepKitData | null;
  resumeMissing: boolean;
  onKitChange: (hasKit: boolean) => void;
}) {
  const [prepKit, setPrepKit] = useState(initialPrepKit);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/prepkit`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.status === 409) {
        // Our local state thought no kit existed, but the server disagrees —
        // most often a slow generation from an earlier click finished after
        // this one started. Fetch the real kit instead of leaving the user
        // stuck on an error with no way to see or delete it.
        const jobRes = await fetch(`/api/jobs/${jobId}`);
        const jobData = await jobRes.json();
        if (jobData.job?.prepKit) {
          setPrepKit(jobData.job.prepKit);
          onKitChange(true);
          return;
        }
      }

      if (!res.ok) {
        throw new Error(data.error ?? "Generation failed. Please try again.");
      }
      setPrepKit(data.prepKit);
      onKitChange(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Generation failed. Please try again.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/prepkit`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPrepKit(null);
        onKitChange(false);
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (prepKit) {
    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={sectionLabel}>Preparation kit</h3>
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-[13px] text-danger hover:underline"
          >
            Delete kit
          </button>
        </div>
        <Section
          title="Cover letter"
          body={prepKit.coverLetter}
          filename="cover-letter.pdf"
          documentStyle
        />
        <Section
          title="Rewritten resume"
          body={prepKit.rewrittenResume}
          filename="resume.pdf"
          documentStyle
        />
        <Section
          title="Likely interview questions"
          body={prepKit.interviewQuestions
            .map((q, i) => `${i + 1}. ${q}`)
            .join("\n\n")}
          filename="interview-questions.pdf"
        />
        <Section
          title="Company brief"
          body={prepKit.companyBrief}
          filename="company-brief.pdf"
        />

        {confirmDelete && (
          <ConfirmDialog
            title="Delete this Preparation Kit?"
            description="You'll need to generate a new one to get updated materials. This can't be undone."
            confirmLabel={deleting ? "Deleting…" : "Delete"}
            danger
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-md border border-dashed border-border p-4 text-center">
      {resumeMissing ? (
        <p className="text-[15px] text-text-dim">
          Upload your base resume in your{" "}
          <a href="/profile" className="text-accent hover:underline">
            profile
          </a>{" "}
          before generating a Preparation Kit.
        </p>
      ) : (
        <>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-md bg-accent px-3 py-1.5 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {generating
              ? "Generating… this can take a minute"
              : "Generate Preparation Kit"}
          </button>
          {error && <p className="mt-2 text-[15px] text-danger">{error}</p>}
        </>
      )}
    </div>
  );
}
