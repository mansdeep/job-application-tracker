"use client";

export function CharCount({ length, max }: { length: number; max: number }) {
  const over = length > max;
  return (
    <span
      className={`text-[12px] tabular-nums ${over ? "text-danger" : "text-text-dim"}`}
    >
      {length.toLocaleString()}/{max.toLocaleString()}
    </span>
  );
}
