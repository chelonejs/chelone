import {
  type FilterPayload,
  isFilterSelected,
  toggleFilterValue,
} from "@chelone/core";
import type { LiHTMLAttributes, ReactNode } from "react";
import { useTranslate } from "../../../i18n-hooks";
import { cn } from "../../../lib/utils";
import { useListFilterContext } from "../../../list/list-slice-hooks";
import { Button } from "../../ui/button";

export interface FilterListItemProps
  extends Omit<LiHTMLAttributes<HTMLLIElement>, "value"> {
  /** A string is translated with itself as the fallback; an element renders as it is. */
  label: ReactNode;
  /** The filter this item sets, and removes again once the list holds it. */
  value: FilterPayload;
  icon?: ReactNode;
  /** Replaces `isFilterSelected`. */
  isSelected?: (value: FilterPayload, filters: FilterPayload) => boolean;
  /** Replaces `toggleFilterValue`; returns the filters to set. */
  toggleFilter?: (
    value: FilterPayload,
    filters: FilterPayload,
  ) => FilterPayload;
}

/**
 * One-click filter of the `<List>` aside. Selecting merges `value` into the
 * list filter, selecting it again removes its keys. A selected item also shows
 * a clear control, a sibling of the toggle because a button cannot hold one.
 *
 * Not memoised, so a changed `isSelected`, `toggleFilter` or `icon` applies.
 */
function FilterListItem({
  label,
  value,
  icon,
  isSelected = isFilterSelected,
  toggleFilter = toggleFilterValue,
  className,
  ...rest
}: FilterListItemProps) {
  const translate = useTranslate();
  const { filterValues, setFilters } = useListFilterContext();
  const selected = isSelected(value, filterValues);
  const toggle = () => setFilters(toggleFilter(value, filterValues));

  return (
    <li
      data-slot="filter-list-item"
      className={cn(
        "flex items-center gap-1",
        selected && "filter-list-item-selected",
        className,
      )}
      {...rest}
    >
      <Button
        type="button"
        variant={selected ? "secondary" : "ghost"}
        size="sm"
        className="flex-1 justify-start"
        aria-pressed={selected}
        data-selected={selected}
        onClick={toggle}
      >
        {icon}
        {typeof label === "string" ? translate(label, { _: label }) : label}
      </Button>
      {selected && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={translate("chelone.action.remove_filter", {
            _: "Remove filter",
          })}
          onClick={toggle}
        >
          <span aria-hidden="true">×</span>
        </Button>
      )}
    </li>
  );
}

export { FilterListItem };
