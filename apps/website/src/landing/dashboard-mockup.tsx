import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { insetCard } from "./constants";
import { StatusBadge, type StatusTone } from "./status-badge";

const nav = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Orders", icon: ShoppingCart },
  { label: "Products", icon: Package },
  { label: "Customers", icon: Users },
  { label: "Reviews", icon: Star },
];

const stats = [
  { label: "Revenue", value: "$48.2k" },
  { label: "Orders", value: "1,204" },
  { label: "Customers", value: "12.4k" },
];

const orders: {
  name: string;
  status: string;
  amount: string;
  tone: StatusTone;
}[] = [
  { name: "Alice Kim", status: "Paid", amount: "$129", tone: "positive" },
  { name: "Ben Moss", status: "Paid", amount: "$89", tone: "positive" },
  { name: "Clara Sol", status: "Pending", amount: "$420", tone: "warning" },
  { name: "Dan Tran", status: "Refunded", amount: "$57", tone: "negative" },
];

// 30-day revenue points, normalised into the SVG's 0..100 x / 0..40 y box.
const spark = "0,30 10,26 20,28 30,20 40,23 50,15 60,18 70,10 80,13 90,6 100,8";

/** Hand-coded mini admin dashboard — sidebar, stats, sparkline, orders table. */
export function DashboardMockup() {
  return (
    <div
      className={cn("flex min-h-[22rem] overflow-hidden text-left", insetCard)}
    >
      {/* Sidebar */}
      <aside className="hidden w-44 shrink-0 flex-col border-r border-border/60 bg-muted/30 p-3 sm:flex">
        <div className="flex items-center gap-2 px-1 pb-3">
          <span className="flex size-6 items-center justify-center rounded-md bg-brand-gradient text-[10px] font-bold text-white">
            A
          </span>
          <span className="text-sm font-semibold text-foreground">
            Acme Inc.
          </span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {nav.map((item) => (
            <span
              key={item.label}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                item.active
                  ? "bg-brand-gradient font-medium text-white"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="size-3.5" strokeWidth={1.75} />
              {item.label}
            </span>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 space-y-4 p-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-border/60 bg-background/60 p-3"
            >
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className="mt-0.5 text-lg font-bold tracking-tight text-foreground">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Sparkline */}
        <div className="rounded-lg border border-border/60 bg-background/60 p-3">
          <p className="mb-2 text-[11px] text-muted-foreground">
            Revenue · last 30 days
          </p>
          {/* Decorative sample chart — the panel heading above labels it, so
              the svg is hidden from assistive tech rather than titled. */}
          {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative, aria-hidden */}
          <svg
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            className="h-16 w-full"
            aria-hidden
          >
            <defs>
              <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`0,40 ${spark} 100,40`} fill="url(#spark-fill)" />
            <polyline
              points={spark}
              fill="none"
              stroke="#7c6cf0"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        {/* Orders table */}
        <div className="overflow-hidden rounded-lg border border-border/60 bg-background/60">
          <table className="w-full text-sm">
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.name}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="px-3 py-2 font-medium text-foreground">
                    {o.name}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge tone={o.tone}>{o.status}</StatusBadge>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {o.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
