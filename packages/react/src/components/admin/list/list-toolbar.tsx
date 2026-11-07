import type { Exporter } from "@chelone/core";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "../../../lib/utils";
import { FilterContextProvider } from "../../../list/filter-context";
import { FilterForm } from "./filter-form";
import { ListActions } from "./list-actions";

/** The props `ListToolbar` hands to its actions element. */
interface ToolbarActionProps {
  exporter?: Exporter | false;
  hasCreate?: boolean;
  filters?: ReactNode[];
}

interface ListToolbarProps {
  /** Filter inputs: an array, or an element whose children are the inputs. */
  filters?: ReactElement | ReactNode[];
  /** The right-hand element; `false` renders none. Defaults to `<ListActions>`. */
  actions?: ReactElement<ToolbarActionProps> | false;
  className?: string;
  /** Handed to the actions element; `false` hides the export button. */
  exporter?: Exporter | false;
  /** Handed to the actions element. */
  hasCreate?: boolean;
}

/** The toolbar's own props that the element has not set itself. */
function defaultsFor(
  element: ReactElement<ToolbarActionProps>,
  candidates: ToolbarActionProps,
): ToolbarActionProps {
  const own = element.props;
  const defaults: ToolbarActionProps = {};
  if (candidates.exporter !== undefined && own.exporter === undefined) {
    defaults.exporter = candidates.exporter;
  }
  if (candidates.hasCreate !== undefined && own.hasCreate === undefined) {
    defaults.hasCreate = candidates.hasCreate;
  }
  if (candidates.filters !== undefined && own.filters === undefined) {
    defaults.filters = candidates.filters;
  }
  return defaults;
}

/**
 * The bar above a list: the filter form on the left and the actions on the
 * right. Publishes the filters on `FilterContext` for its subtree.
 *
 * A custom `actions` element is cloned with `exporter`, `hasCreate` and
 * `filters`, setting only those the toolbar was given and the element has not
 * set itself.
 *
 * @example
 * <List actions={<ListToolbar filters={[<TextInput key="q" source="q" alwaysOn />]} />} />
 */
function ListToolbar(props: ListToolbarProps) {
  const {
    filters: filtersProp,
    actions,
    className,
    exporter,
    hasCreate,
  } = props;
  const filters = Array.isArray(filtersProp)
    ? filtersProp
    : isValidElement<{ children?: ReactNode }>(filtersProp)
      ? Children.toArray(filtersProp.props.children)
      : undefined;

  const actionsElement =
    actions === false ? null : actions ? (
      cloneElement(
        actions,
        defaultsFor(actions, { exporter, hasCreate, filters }),
      )
    ) : (
      <ListActions exporter={exporter} hasCreate={hasCreate} />
    );

  const content = (
    <div
      data-slot="list-toolbar"
      className={cn("flex items-start justify-between gap-2", className)}
    >
      {filters ? <FilterForm filters={filters} /> : <span />}
      {actionsElement}
    </div>
  );

  return filters && filters.length > 0 ? (
    <FilterContextProvider value={filters}>{content}</FilterContextProvider>
  ) : (
    content
  );
}

export { ListToolbar, type ListToolbarProps };
