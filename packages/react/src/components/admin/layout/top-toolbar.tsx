import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type TopToolbarProps = ComponentProps<"div">;

/** The row of view actions to pass to `<List actions>`. */
export function TopToolbar({ className, ...props }: TopToolbarProps) {
  return (
    <div
      data-slot="top-toolbar"
      className={cn("flex items-center justify-end gap-2 mb-2", className)}
      {...props}
    />
  );
}
