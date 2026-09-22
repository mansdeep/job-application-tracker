"use client";

import { Modal } from "@/components/ui/modal";

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal onClose={onCancel}>
      <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-text-primary">
        {title}
      </h2>
      <p className="mt-2 text-[15px] text-text-secondary">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md border border-border px-3 py-1.5 text-[15px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`rounded-md px-3 py-1.5 text-[15px] font-medium text-white transition-colors ${
            danger ? "bg-danger hover:bg-danger/85" : "bg-accent hover:bg-accent-hover"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
