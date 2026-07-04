/**
 * `<Spinner>` — the admin-kit spinner over the shadcn `ui/spinner` primitive.
 * Ported verbatim from shadmin `feedback/spinner.tsx` (no shadmin-core seam;
 * pure `@/`-alias deps). Layers a `size` scale, an optional `show` gate, and the
 * primary color onto the base spinner. Used by `<Loading>`.
 */

import { Spinner as UISpinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const sizeClasses = {
  small: "size-6",
  medium: "size-8",
  large: "size-12",
} as const;

interface SpinnerContentProps {
  size?: keyof typeof sizeClasses;
  show?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Animated spinner for loading states.
 *
 * Thin wrapper over the shadcn `ui/spinner` that layers on the admin kit's
 * `size` scale, an optional `show` gate, and the primary color.
 */
function Spinner({
  size = "medium",
  show = true,
  className,
  "aria-label": ariaLabel,
}: SpinnerContentProps) {
  if (show === false) {
    return null;
  }
  return (
    <UISpinner
      aria-label={ariaLabel ?? "Loading"}
      className={cn("text-primary", sizeClasses[size], className)}
    />
  );
}

export { Spinner, type SpinnerContentProps };
