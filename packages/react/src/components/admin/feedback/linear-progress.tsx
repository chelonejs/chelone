/**
 * `<LinearProgress>` — a delayed loading bar that stands in for an input or a
 * field in a form layout while data loads. Ported from shadmin
 * `feedback/linear-progress.tsx`; the ONE seam (shadmin-core's `useTimeout`)
 * is rewired to `@chelone/react`'s compat hook. The delay avoids a visual jump
 * when the bar is finally replaced by the resolved value.
 */

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { useTimeout } from "../../../compat-hooks";

interface LinearProgressProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Delay in milliseconds before showing the progress bar.
   * @default 1000
   */
  timeout?: number;
  /**
   * When provided, switches to determinate mode and renders the bar at
   * `(value / max) * 100` percent width.
   */
  value?: number;
  /**
   * Maximum value used to compute the fill percentage.
   * @default 100
   */
  max?: number;
}

/**
 * Linear progress bar with a delay before it appears.
 *
 * @example
 * import { LinearProgress } from "@chelone/react";
 *
 * const ReferenceFieldFallback = () => <LinearProgress />;
 */
function LinearProgress(props: LinearProgressProps) {
  const { className, timeout = 1000, value, max = 100, ...rest } = props;
  const oneSecondHasPassed = useTimeout(timeout);

  if (!oneSecondHasPassed) {
    return <span className="block my-1 h-1" />;
  }

  return (
    <div
      data-slot="linear-progress"
      className={cn(
        "my-2 w-40 h-1 overflow-hidden rounded bg-muted",
        className,
      )}
      {...rest}
    >
      {value !== undefined ? (
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${(value / max) * 100}%` }}
        />
      ) : (
        <div className="h-full w-1/2 bg-primary animate-pulse" />
      )}
    </div>
  );
}

export { LinearProgress, type LinearProgressProps };
