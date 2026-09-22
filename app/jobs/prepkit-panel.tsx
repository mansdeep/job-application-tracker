"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CharCount } from "@/components/ui/char-count";
import { downloadTextAsPdf } from "@/lib/pdf-export";
import { formatCountdown } from "@/lib/format";
import { LIMITS } from "@/lib/limits";
import type { PrepKitData } from "@/lib/types";

// Matches PREPKIT_DEADLINE_MS in lib/anthropic.ts — generation is hard-capped
// there, so the countdown reaching 0 reflects a real deadline, not just a
// cosmetic estimate. In practice generation finishes far sooner than this.
const PREPKIT_DEADLINE_SECONDS = 180;

const sectionLabel =
  "text-[12px] font-medium uppercase tracking-[-0.01em] text-text-dim";

const sectionButton =
  "text-[13px] text-text-secondary transition-colors hover:text-text-primary";

function parseQuestions(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim().replace(/^\d+\.\s*/, ""))
    .filter(Boolean);
}

function formatBullets(items: string[], emptyText: string): string {
  return items.length ? items.map((s) => `- ${s}`).join("\n") : emptyText;
}

function parseBullets(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean);
}

function Section({
  title,
  body,
  filename,
  documentStyle = false,
  onSave,
  maxLength,
}: {
  title: string;
  body: string;
  filename: string;
  /** True for content meant to look like a real, sendable document (a
   * resume, a cover letter) — the downloaded PDF omits our own section
   * label as a heading so it just looks like the document itself. */
  documentStyle?: boolean;
  /** When provided, an Edit control appears and this section becomes
   * editable — called with the edited text on Save. Omit to keep the
   * section read-only. */
  onSave?: (newBody: string) => Promise<void>;
  /** Character limit shown as a used/limit counter while editing. */
  maxLength?: number;
}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(body);
  }, [body, editing]);

  async function handleCopy() {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-surface-1 p-3">
      <div className="flex items-center justify-between">
        <h4 className={sectionLabel}>{title}</h4>
        <div className="flex gap-3">
          {editing ? (
            <>
              <button
                onClick={() => {
                  setEditing(false);
                  setSaveError(null);
                }}
                disabled={saving}
                className={sectionButton}
              >
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className={sectionButton}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <>
              {onSave && (
                <button onClick={() => setEditing(true)} className={sectionButton}>
                  Edit
                </button>
              )}
              <button onClick={handleCopy} className={sectionButton}>
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() =>
                  downloadTextAsPdf(body, filename, documentStyle ? undefined : title)
                }
                className={sectionButton}
              >
                Download
              </button>
            </>
          )}
        </div>
      </div>
      {editing ? (
        <>
          <textarea
            rows={documentStyle ? 14 : 8}
            maxLength={maxLength}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="mt-2 w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-[15px] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          {maxLength !== undefined && (
            <div className="mt-1 flex justify-end">
              <CharCount length={draft.length} max={maxLength} />
            </div>
          )}
        </>
      ) : (
        <p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-[15px] text-text-secondary">
          {body}
        </p>
      )}
      {saveError && <p className="mt-1 text-[13px] text-danger">{saveError}</p>}
    </div>
  );
}

export function PrepKitPanel({
  jobId,
  initialPrepKit,
  resumeMissing,
  onKitChange,
  onGeneratingChange,
}: {
  jobId: string;
  initialPrepKit: PrepKitData | null;
  resumeMissing: boolean;
  onKitChange: (hasKit: boolean) => void;
  /** Called whenever generation starts/stops, so the parent can warn before
   * the job detail modal is closed mid-generation. */
  onGeneratingChange?: (generating: boolean) => void;
}) {
  const [prepKit, setPrepKit] = useState(initialPrepKit);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PREPKIT_DEADLINE_SECONDS);

  useEffect(() => {
    if (!generating) return;
    setSecondsLeft(PREPKIT_DEADLINE_SECONDS);
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [generating]);

  async function handleGenerate() {
    setGenerating(true);
    onGeneratingChange?.(true);
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
      onGeneratingChange?.(false);
    }
  }

  async function saveField(patch: Record<string, unknown>) {
    const res = await fetch(`/api/jobs/${jobId}/prepkit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Couldn't save changes. Please try again.");
    }
    setPrepKit(data.prepKit);
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
          onSave={(text) => saveField({ coverLetter: text })}
          maxLength={LIMITS.coverLetter}
        />
        <Section
          title="Rewritten resume"
          body={prepKit.rewrittenResume}
          filename="resume.pdf"
          documentStyle
          onSave={(text) => saveField({ rewrittenResume: text })}
          maxLength={LIMITS.rewrittenResume}
        />
        <Section
          title="Likely interview questions"
          body={prepKit.interviewQuestions
            .map((q, i) => `${i + 1}. ${q}`)
            .join("\n\n")}
          filename="interview-questions.pdf"
          onSave={(text) => saveField({ interviewQuestions: parseQuestions(text) })}
          maxLength={LIMITS.interviewQuestionsBlock}
        />
        <Section
          title="Company brief"
          body={prepKit.companyBrief}
          filename="company-brief.pdf"
          onSave={(text) => saveField({ companyBrief: text })}
          maxLength={LIMITS.companyBrief}
        />
        <Section
          title="Resume gaps vs. job description"
          body={formatBullets(prepKit.resumeGaps, "No major gaps found.")}
          filename="resume-gaps.pdf"
          onSave={(text) => saveField({ resumeGaps: parseBullets(text) })}
          maxLength={LIMITS.resumeGapsBlock}
        />
        <Section
          title="Skills added to rewritten resume"
          body={formatBullets(prepKit.resumeAdditions, "No notable additions made.")}
          filename="resume-additions.pdf"
          onSave={(text) => saveField({ resumeAdditions: parseBullets(text) })}
          maxLength={LIMITS.resumeAdditionsBlock}
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
            {generating ? "Generating…" : "Generate Preparation Kit"}
          </button>
          {generating && (
            <p className="mt-2 flex items-center justify-center gap-2 text-[13px] text-text-dim">
              <span className="font-mono tabular-nums text-text-secondary">
                {formatCountdown(secondsLeft)}
              </span>
              <span>
                {secondsLeft > 0
                  ? "Usually done in under a minute — capped at 3 minutes."
                  : "Still finishing up…"}
              </span>
            </p>
          )}
          {error && <p className="mt-2 text-[15px] text-danger">{error}</p>}
        </>
      )}
    </div>
  );
}
