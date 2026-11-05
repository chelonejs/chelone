import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CalloutType = "note" | "tip" | "warning" | "danger";

interface CalloutProps {
  type?: CalloutType;
  children: ReactNode;
}

const ICONS: Record<CalloutType, string> = {
  note: "ℹ️",
  tip: "💡",
  warning: "⚠️",
  danger: "🚨",
};

const STYLES: Record<CalloutType, string> = {
  note: "border-blue-500/30 bg-blue-500/5 text-blue-900 dark:text-blue-100",
  tip: "border-green-500/30 bg-green-500/5 text-green-900 dark:text-green-100",
  warning:
    "border-yellow-500/30 bg-yellow-500/5 text-yellow-900 dark:text-yellow-100",
  danger: "border-red-500/30 bg-red-500/5 text-red-900 dark:text-red-100",
};

const LABEL: Record<CalloutType, string> = {
  note: "Note",
  tip: "Tip",
  warning: "Warning",
  danger: "Danger",
};

export function Callout({ type = "note", children }: CalloutProps) {
  const t: CalloutType = type in STYLES ? type : "note";
  return (
    <aside
      className={cn("my-4 flex gap-3 rounded-lg border p-4", STYLES[t])}
      role="note"
      aria-label={LABEL[t]}
    >
      <span className="mt-0.5 text-lg leading-none select-none" aria-hidden>
        {ICONS[t]}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </aside>
  );
}

export default Callout;
