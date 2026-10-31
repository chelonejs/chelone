import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PlaceholderProps extends ComponentProps<"span"> {
  /** Merged after the default `inline-flex bg-muted` classes. */
  className?: string;
  /** Content to show. Defaults to a non-breaking space. */
  children?: ReactNode;
}

/**
 * A muted block that holds a field's height while its value loads. With no
 * children it renders a non-breaking space: a plain space collapses to zero
 * height in a flex container.
 *
 * @example
 * import { Placeholder } from "@chelone/react";
 *
 * const NameFallback = () => <Placeholder className="w-24" />;
 */
function Placeholder({ className, children, ...props }: PlaceholderProps) {
  return (
    <span className={cn("inline-flex bg-muted", className)} {...props}>
      {children ?? " "}
    </span>
  );
}

export { Placeholder, type PlaceholderProps };
