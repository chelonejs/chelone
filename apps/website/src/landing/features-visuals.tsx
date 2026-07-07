import type { CSSProperties, ReactElement } from "react";
import { cn } from "@/lib/utils";

/**
 * Mini-visuals that fill the larger bento cards (ported from the v1 landing,
 * re-skinned to the brand gradient). Each fills its card via `h-full`.
 * Only cards for shipped capabilities have a visual — no aspirational cards.
 */

function DataTableVisual() {
  const rows = [
    { id: "row-1", w: "w-20", color: "#22c55e" },
    { id: "row-2", w: "w-14", color: "#22c55e" },
    { id: "row-3", w: "w-24", color: "#f59e0b" },
    { id: "row-4", w: "w-16", color: "#ef4444" },
  ];
  return (
    <div className="flex h-full flex-col justify-between gap-2">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex flex-1 items-center gap-3 rounded-lg bg-foreground/5 px-3"
        >
          <span className="size-5 shrink-0 rounded-full bg-foreground/10" />
          <span className={cn("h-2 rounded bg-foreground/15", row.w)} />
          <span
            className="ml-auto size-2 shrink-0 rounded-full"
            style={{ backgroundColor: row.color }}
          />
        </div>
      ))}
    </div>
  );
}

function ThemingVisual() {
  const swatches: { id: string; className?: string; style?: CSSProperties }[] =
    [
      { id: "sw-brand", className: "bg-brand-gradient" },
      { id: "sw-violet", style: { backgroundColor: "#8b5cf6" } },
      { id: "sw-indigo", style: { backgroundColor: "#4f46e5" } },
      { id: "sw-emerald", style: { backgroundColor: "#10b981" } },
      { id: "sw-amber", style: { backgroundColor: "#f59e0b" } },
    ];
  return (
    <div className="flex h-full items-center gap-2">
      {swatches.map((s) => (
        <span
          key={s.id}
          className={cn("size-7 shrink-0 rounded-lg", s.className)}
          style={s.style}
        />
      ))}
    </div>
  );
}

function FormVisual() {
  return (
    <div className="flex h-full flex-col justify-center gap-2.5">
      <div className="flex items-center gap-2.5">
        <span className="h-2 w-14 shrink-0 rounded bg-foreground/15" />
        <span className="h-6 flex-1 rounded-md border border-border bg-background/60" />
      </div>
      <div className="flex justify-end">
        <span className="h-6 w-16 rounded-md bg-brand-gradient" />
      </div>
    </div>
  );
}

/** Visual keyed by feature title — only the larger cards have one. */
export const FEATURE_VISUALS: Record<string, () => ReactElement> = {
  "Lists & Data Tables": DataTableVisual,
  "Flexible Theming": ThemingVisual,
  "Forms & Validation": FormVisual,
};
