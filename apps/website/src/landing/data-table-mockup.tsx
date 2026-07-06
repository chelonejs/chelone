import { Check, Download, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { insetCard } from "./constants";
import { StatusBadge, type StatusTone } from "./status-badge";

const rows: {
  name: string;
  product: string;
  status: string;
  tone: StatusTone;
  selected: boolean;
}[] = [
  {
    name: "Alice Kim",
    product: "Pro Plan",
    status: "Approved",
    tone: "positive",
    selected: true,
  },
  {
    name: "Ben Moss",
    product: "Starter",
    status: "Approved",
    tone: "positive",
    selected: true,
  },
  {
    name: "Clara Sol",
    product: "Enterprise",
    status: "Pending",
    tone: "warning",
    selected: false,
  },
  {
    name: "Dan Tran",
    product: "Pro Plan",
    status: "Pending",
    tone: "warning",
    selected: true,
  },
  {
    name: "Eva Lee",
    product: "Starter",
    status: "Rejected",
    tone: "negative",
    selected: false,
  },
];

/** Hand-coded orders data-table with toolbar + bulk-action bar. */
export function DataTableMockup() {
  return (
    <div className={cn("overflow-hidden text-left", insetCard)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
        <span className="text-sm font-semibold text-foreground">Orders</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground"
          >
            <Filter className="size-3.5" strokeWidth={1.75} />
            Filter
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground"
          >
            <Download className="size-3.5" strokeWidth={1.75} />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="w-9 px-3 py-2" />
            <th className="px-3 py-2 font-medium">Customer</th>
            <th className="px-3 py-2 font-medium">Product</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.name}
              className={cn(
                "border-b border-border/40 last:border-0",
                r.selected && "bg-violet-500/[0.06]",
              )}
            >
              <td className="px-3 py-2.5">
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded border",
                    r.selected
                      ? "border-transparent bg-brand-gradient text-white"
                      : "border-border",
                  )}
                >
                  {r.selected && <Check className="size-3" strokeWidth={3} />}
                </span>
              </td>
              <td className="px-3 py-2.5 font-medium text-foreground">
                {r.name}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{r.product}</td>
              <td className="px-3 py-2.5">
                <StatusBadge tone={r.tone}>{r.status}</StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Bulk-action bar */}
      <div className="flex items-center gap-3 border-t border-border/60 bg-muted/40 px-3 py-2.5">
        <span className="text-xs font-medium text-foreground">3 selected</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white"
          >
            <Check className="size-3.5" strokeWidth={2} />
            Approve
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground"
          >
            <X className="size-3.5" strokeWidth={2} />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
