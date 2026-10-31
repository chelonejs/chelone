import type { HTMLAttributes, ReactNode } from "react";
import { useTranslate } from "../../../i18n-hooks";
import { cn } from "../../../lib/utils";

export interface FilterListSectionProps extends HTMLAttributes<HTMLDivElement> {
  /** Translated with itself as the fallback. */
  label: string;
  icon?: ReactNode;
}

/**
 * A titled group of the `<List>` aside: an optional icon and the label above
 * its children. `<FilterList>` is this section holding a `<ul>`.
 */
function FilterListSection({
  label,
  icon,
  children,
  className,
  ...rest
}: FilterListSectionProps) {
  const translate = useTranslate();
  return (
    <div
      data-slot="filter-list-section"
      className={cn("flex flex-col gap-1", className)}
      {...rest}
    >
      <div className="flex items-center gap-2 px-2 text-sm font-medium [&_svg]:size-4">
        {icon}
        <span>{translate(label, { _: label })}</span>
      </div>
      {children}
    </div>
  );
}

export { FilterListSection };
