import { cn } from "@/lib/utils";

/** Semantic colour of a {@link StatusBadge} — maps to the ring/tint palette. */
export type StatusTone = "positive" | "warning" | "negative";

const toneClasses: Record<StatusTone, string> = {
  positive:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  warning:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  negative: "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20",
};

interface StatusBadgeProps {
  /** Visible label, e.g. "Paid", "Pending", "Rejected". */
  children: string;
  /** Colour bucket for the tint + ring. */
  tone: StatusTone;
}

/** Pill badge used inside the dashboard/data-table mockups to mark row state. */
export function StatusBadge({ children, tone }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
