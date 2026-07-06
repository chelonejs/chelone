import { Search, Sparkles } from "lucide-react";
import type { CSSProperties, ReactElement } from "react";
import { cn } from "@/lib/utils";

/**
 * Mini-visuals that fill the larger bento cards (ported from the v1 landing,
 * re-skinned to the brand gradient). Each fills its card via `h-full`.
 */

const BRAND = "#8b5cf6";
const MAP_CELLS = Array.from({ length: 8 * 7 }, (_, i) => ({
  id: i,
  pin: [12, 26, 43, 51].includes(i),
}));

function MapVisual() {
  return (
    <div className="grid h-full grid-cols-8 grid-rows-7 place-items-center gap-1.5">
      {MAP_CELLS.map((cell) => (
        <span
          key={cell.id}
          className={cn(
            "rounded-full",
            cell.pin
              ? "size-2.5 bg-brand-gradient"
              : "size-1.5 bg-foreground/10",
          )}
          style={
            cell.pin
              ? { boxShadow: "0 0 8px 2px rgba(139,92,246,0.45)" }
              : undefined
          }
        />
      ))}
    </div>
  );
}

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

function AIVisual() {
  const lines = ["w-3/4", "w-full", "w-5/6", "w-2/3", "w-11/12", "w-1/2"];
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
        <Sparkles size={14} style={{ color: BRAND }} className="shrink-0" />
        <span className="flex-1 truncate text-xs text-muted-foreground">
          Generate an admin for my API…
        </span>
        <kbd className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ↵
        </kbd>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2">
        {lines.map((w, i) => (
          <span
            key={w}
            className={cn(
              "h-2 rounded",
              i % 2 === 0 ? "bg-foreground/15" : "bg-foreground/10",
              w,
            )}
          />
        ))}
      </div>
    </div>
  );
}

function CommandMenuVisual() {
  return (
    <div className="flex h-full items-center">
      <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2.5">
        <Search size={14} className="shrink-0 text-muted-foreground" />
        <span className="flex-1 text-sm text-muted-foreground">Search…</span>
        <kbd className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </div>
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

const PERMS = ["create", "read", "update"];
const ROLE_MATRIX = [
  { role: "Admin", grants: [true, true, true] },
  { role: "Editor", grants: [true, true, false] },
  { role: "Viewer", grants: [true, false, false] },
];

function RolesVisual() {
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      {ROLE_MATRIX.map(({ role, grants }) => (
        <div key={role} className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-[11px] text-muted-foreground">
            {role}
          </span>
          <div className="flex gap-1.5">
            {PERMS.map((perm, j) => (
              <span
                key={perm}
                className={cn(
                  "size-3.5 rounded",
                  grants[j] ? "bg-brand-gradient" : "bg-foreground/10",
                )}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Visual keyed by feature title — only the larger cards have one. */
export const FEATURE_VISUALS: Record<string, () => ReactElement> = {
  "Data Maps": MapVisual,
  "Lists & Data Tables": DataTableVisual,
  "AI-Ready": AIVisual,
  "Command Menu": CommandMenuVisual,
  "Flexible Theming": ThemingVisual,
  "Forms & Validation": FormVisual,
  "Roles & Permissions": RolesVisual,
};
