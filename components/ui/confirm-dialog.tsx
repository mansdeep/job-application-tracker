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
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
            danger ? "bg-red-600 hover:bg-red-700" : "bg-gray-900 hover:bg-gray-800"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
