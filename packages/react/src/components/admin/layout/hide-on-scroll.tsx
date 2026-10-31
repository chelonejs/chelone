import { type ComponentProps, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface HideOnScrollProps extends ComponentProps<"div"> {
  /** Scroll offset in pixels a downward scroll must pass before hiding. @default 100 */
  threshold?: number;
}

/**
 * Wraps a header and sets `data-state="hidden"` on a downward scroll past
 * `threshold`, `"visible"` on any upward scroll.
 */
export function HideOnScroll({
  threshold = 100,
  className,
  ...props
}: HideOnScrollProps) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY && y > threshold) setHidden(true);
      else if (y < lastY) setHidden(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return (
    <div
      data-state={hidden ? "hidden" : "visible"}
      className={cn(
        "transition-transform duration-300 data-[state=hidden]:-translate-y-full",
        className,
      )}
      {...props}
    />
  );
}
