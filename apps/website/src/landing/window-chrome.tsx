import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { insetCard } from "./constants";

interface WindowChromeProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/** macOS-style window: traffic-light dots + title bar + body slot. */
export function WindowChrome({
  title,
  children,
  className,
}: WindowChromeProps) {
  return (
    <div className={cn("overflow-hidden text-left", insetCard, className)}>
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-3 rounded-full bg-[#ed6a5e]" />
          <span className="size-3 rounded-full bg-[#f4bf4f]" />
          <span className="size-3 rounded-full bg-[#61c554]" />
        </span>
        <span className="ml-2 text-xs font-medium text-muted-foreground">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
