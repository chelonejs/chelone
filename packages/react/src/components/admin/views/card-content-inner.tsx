import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type CardContentInnerProps = ComponentProps<"div">;

/**
 * One section of a `<Card>` with several stacked sections. The first section
 * adds the top padding and the last the bottom padding, so adjacent sections
 * do not double their padding.
 */
function CardContentInner({ className, ...props }: CardContentInnerProps) {
  return (
    <div
      className={cn(
        "px-6 py-0 first:pt-4 last:pb-[70px] sm:last:pb-4",
        className,
      )}
      {...props}
    />
  );
}

export { CardContentInner, type CardContentInnerProps };
