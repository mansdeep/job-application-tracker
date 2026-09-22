"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type AdminUser = {
  id: string;
  email: string;
  isApproved: boolean;
  createdAt: string;
};

const sectionLabel =
  "text-[12px] font-medium uppercase tracking-[-0.01em] text-text-dim";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function UserList({
  initialPending,
  initialApproved,
}: {
  initialPending: AdminUser[];
  initialApproved: AdminUser[];
}) {
  const [pending, setPending] = useState(initialPending);
  const [approved, setApproved] = useState(initialApproved);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<AdminUser | null>(null);

  async function setApproval(user: AdminUser, isApproved: boolean) {
    setBusyId(user.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't update this user. Please try again.");
      }
      if (isApproved) {
        setPending((prev) => prev.filter((u) => u.id !== user.id));
        setApproved((prev) => [{ ...user, isApproved: true }, ...prev]);
      } else {
        setApproved((prev) => prev.filter((u) => u.id !== user.id));
        setPending((prev) => [{ ...user, isApproved: false }, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update this user. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(user: AdminUser) {
    setBusyId(user.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't remove this user. Please try again.");
      }
      setPending((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove this user. Please try again.");
    } finally {
      setBusyId(null);
      setConfirmReject(null);
    }
  }

  return (
    <div className="mt-6 space-y-8">
      {error && <p className="text-[15px] text-danger">{error}</p>}

      <div>
        <h3 className={sectionLabel}>Pending approval ({pending.length})</h3>
        {pending.length === 0 ? (
          <p className="mt-2 text-[15px] text-text-dim">No pending sign-ups.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {pending.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-1 p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-[15px] text-text-primary">{user.email}</div>
                  <div className="text-[13px] text-text-dim">
                    Signed up {formatDate(user.createdAt)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setConfirmReject(user)}
                    disabled={busyId === user.id}
                    className="rounded-md border border-border px-3 py-1.5 text-[13px] text-danger transition-colors hover:bg-surface-3 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setApproval(user, true)}
                    disabled={busyId === user.id}
                    className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                  >
                    {busyId === user.id ? "Approving…" : "Approve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className={sectionLabel}>Approved ({approved.length})</h3>
        {approved.length === 0 ? (
          <p className="mt-2 text-[15px] text-text-dim">No approved users yet.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {approved.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-1 p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-[15px] text-text-primary">{user.email}</div>
                  <div className="text-[13px] text-text-dim">
                    Signed up {formatDate(user.createdAt)}
                  </div>
                </div>
                <button
                  onClick={() => setApproval(user, false)}
                  disabled={busyId === user.id}
                  className="shrink-0 rounded-md border border-border px-3 py-1.5 text-[13px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary disabled:opacity-50"
                >
                  {busyId === user.id ? "Revoking…" : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmReject && (
        <ConfirmDialog
          title="Reject this sign-up?"
          description={`This permanently deletes the account for ${confirmReject.email}. This can't be undone.`}
          confirmLabel={busyId === confirmReject.id ? "Rejecting…" : "Reject"}
          danger
          onConfirm={() => handleReject(confirmReject)}
          onCancel={() => setConfirmReject(null)}
        />
      )}
    </div>
  );
}
