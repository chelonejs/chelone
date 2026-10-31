import type { ReactNode } from "react";
import {
  FilterListSection,
  type FilterListSectionProps,
} from "./filter-list-section";

export interface FilterListProps extends FilterListSectionProps {
  /** Translated with itself as the fallback. */
  label: string;
  icon?: ReactNode;
}

/** A `<FilterListSection>` holding a `<ul>` of `<FilterListItem>`s. */
function FilterList({ children, ...rest }: FilterListProps) {
  return (
    <FilterListSection {...rest}>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </FilterListSection>
  );
}

export { FilterList };
