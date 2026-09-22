"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ThemeToggle({
  initial,
}: {
  initial: "LIGHT" | "DARK";
}) {
  const router = useRouter();
  const [theme, setTheme] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: "LIGHT" | "DARK") {
    if (next === theme || saving) return;
    setSaving(true);
    setTheme(next);
    try {
      const res = await fetch("/api/profile/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        setTheme(theme);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-1 rounded-md border border-border bg-surface-1 p-1 text-[15px]">
      {(["LIGHT", "DARK"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => handleChange(option)}
          disabled={saving}
          className={`flex-1 rounded px-3 py-1.5 capitalize transition-colors disabled:opacity-60 ${
            theme === option
              ? "bg-surface-3 text-text-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {option.toLowerCase()}
        </button>
      ))}
    </div>
  );
}
