/**
 * `<ToggleFilterButton>` — a one-click filter button. Ported from shadmin
 * `buttons/toggle-filter-button.tsx`; the select and toggle rules come from
 * core's `isFilterSelected` / `toggleFilterValue`, shared with
 * `<FilterListItem>`.
 */

import {
  type FilterPayload,
  isFilterSelected,
  toggleFilterValue,
} from "@chelone/core";
import { CircleX } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useTranslate } from "../../../i18n-hooks";
import { useListFilterContext } from "../../../list/list-slice-hooks";

interface ToggleFilterButtonProps {
  /** A string is translated with itself as the fallback; an element renders as it is. */
  label: ReactNode;
  /** The filter this button sets, and removes again once the list holds it. */
  value: FilterPayload;
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

/**
 * A button that merges `value` into the list filter, and removes its keys
 * when clicked again. While `value` is in the filter it is pressed, shows the
 * secondary variant and a clear icon.
 *
 * @example
 * import { ToggleFilterButton } from "@chelone/react";
 *
 * const PublishedFilter = () => (
 *   <ToggleFilterButton label="Published" value={{ published: true }} />
 * );
 */
function ToggleFilterButton({
  label,
  value,
  size = "sm",
  className,
}: ToggleFilterButtonProps) {
  const translate = useTranslate();
  const { filterValues, setFilters } = useListFilterContext();
  const selected = isFilterSelected(value, filterValues);

  return (
    <Button
      type="button"
      variant={selected ? "secondary" : "ghost"}
      size={size}
      className={className}
      aria-pressed={selected}
      onClick={() => setFilters(toggleFilterValue(value, filterValues))}
    >
      {typeof label === "string" ? translate(label, { _: label }) : label}
      {selected && <CircleX aria-hidden="true" />}
    </Button>
  );
}

export { ToggleFilterButton, type ToggleFilterButtonProps };
