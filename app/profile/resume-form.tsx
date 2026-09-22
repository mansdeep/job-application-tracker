"use client";

import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type ResumeInfo = {
  resumeText: string | null;
  resumeFileName: string | null;
  resumeFileType: string | null;
  resumeUpdatedAt: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ResumeForm({ initial }: { initial: ResumeInfo }) {
  const [resume, setResume] = useState(initial);
  const [editing, setEditing] = useState(!initial.resumeText);
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a PDF or .docx file first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setResume(data.resume);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setResume(data.resume);
      setEditing(false);
      setPastedText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile/resume", { method: "DELETE" });
      if (res.ok) {
        setResume({
          resumeText: null,
          resumeFileName: null,
          resumeFileType: null,
          resumeUpdatedAt: null,
        });
        setEditing(true);
      }
    } finally {
      setSubmitting(false);
      setConfirmDelete(false);
    }
  }

  if (!editing && resume.resumeText) {
    return (
      <div className="rounded-md border border-border bg-surface-2 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[15px] font-medium text-text-primary">
              {resume.resumeFileName ?? "Pasted text"}
            </p>
            <p className="mt-1 font-mono text-[12px] tracking-[-0.01em] text-text-dim">
              {resume.resumeUpdatedAt
                ? `Updated ${formatDate(resume.resumeUpdatedAt)}`
                : ""}{" "}
              · {resume.resumeText.length.toLocaleString()} characters
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded-md border border-border px-3 py-1.5 text-[15px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
            >
              Replace
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-md border border-border px-3 py-1.5 text-[15px] text-danger transition-colors hover:bg-danger/10"
            >
              Delete
            </button>
          </div>
        </div>

        {confirmDelete && (
          <ConfirmDialog
            title="Delete your base resume?"
            description="You'll need to upload or paste it again before generating any Preparation Kits."
            confirmLabel={submitting ? "Deleting…" : "Delete"}
            danger
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-surface-2 p-4">
      <div className="mb-3 flex gap-1 rounded-md border border-border bg-surface-1 p-1 text-[15px]">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`flex-1 rounded px-3 py-1.5 transition-colors ${
            mode === "file"
              ? "bg-surface-3 text-text-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Upload a file
        </button>
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={`flex-1 rounded px-3 py-1.5 transition-colors ${
            mode === "paste"
              ? "bg-surface-3 text-text-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Paste text
        </button>
      </div>

      {mode === "file" ? (
        <form onSubmit={handleFileSubmit} className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[15px] text-text-secondary file:mr-3 file:rounded file:border-0 file:bg-surface-3 file:px-3 file:py-1.5 file:text-[15px] file:text-text-primary"
          />
          <p className="text-[13px] text-text-dim">PDF or .docx, up to 5MB.</p>
          {error && <p className="text-[15px] text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            {resume.resumeText && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md border border-border px-3 py-1.5 text-[15px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-accent px-3 py-1.5 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {submitting ? "Uploading…" : "Save resume"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handlePasteSubmit} className="space-y-3">
          <textarea
            required
            rows={10}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste your resume text here…"
            className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[15px] text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none"
          />
          {error && <p className="text-[15px] text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            {resume.resumeText && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md border border-border px-3 py-1.5 text-[15px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-accent px-3 py-1.5 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save resume"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
