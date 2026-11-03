import type { Exporter } from "@chelone/core";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../../lib/utils";
import { useFilterContext } from "../../../list/filter-context";
import { useResourceContext, useResourceDefinition } from "../../../resource";
import { CreateButton } from "../buttons/create-button";
import { ExportButton } from "../buttons/export-button";
import { FilterButton } from "../buttons/filter-button";

interface ListActionsProps extends HTMLAttributes<HTMLDivElement> {
  /** Filter inputs for the filter button. Defaults to the ambient `FilterContext`. */
  filters?: ReactNode[];
  /** Runs on export; `false` hides the export button. */
  exporter?: Exporter | false;
  /** Show the create button. Defaults to the resource's `hasCreate`. */
  hasCreate?: boolean;
  resource?: string;
  className?: string;
  /** Replaces the whole row of default buttons. */
  children?: ReactNode;
}

/**
 * The right-aligned row of list buttons: add filter, create and export. Pass
 * `children` to replace the buttons.
 *
 * @example
 * <List actions={<ListActions exporter={false} />} />
 */
function ListActions(props: ListActionsProps) {
  const {
    filters: filtersProp,
    exporter,
    hasCreate: hasCreateProp,
    resource: resourceProp,
    className,
    children,
    ...rest
  } = props;
  const resource = useResourceContext(props);
  const { hasCreate: hasCreateDefinition } = useResourceDefinition({
    resource: resourceProp,
  });
  const filters = useFilterContext() ?? filtersProp;
  const hasCreate = hasCreateProp ?? hasCreateDefinition;

  return (
    <div
      className={cn("flex items-center justify-end gap-2", className)}
      {...rest}
    >
      {children ?? (
        <>
          {filters && filters.length > 0 ? (
            <FilterButton filters={filters} resource={resource} />
          ) : null}
          {hasCreate ? <CreateButton resource={resource} /> : null}
          {exporter === false ? null : (
            <ExportButton exporter={exporter} resource={resource} />
          )}
        </>
      )}
    </div>
  );
}

export { ListActions, type ListActionsProps };
