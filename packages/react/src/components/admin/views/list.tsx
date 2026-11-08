/**
 * P7e-T2 — `<List>` ported from shadmin `admin/list/list.tsx` onto chelone's
 * composed `useListController` (NOT ra-core's `ListBase`, which chelone has no
 * equivalent of).
 *
 * The shell: runs `useListController` for the ambient `<Resource>` resource,
 * publishes the result into the `ListContext` (via `ListContextProvider`) so
 * every descendant — the `<DataTable>`, filters, pagination — reads the SAME
 * controller. Renders a title (from the resource label) + the header actions +
 * the children.
 *
 * Chelone divergences from the shadmin original (deliberate, documented):
 * - No `<ListBase>`: the controller IS `useListController`; the view mounts the
 *   `ListContextProvider` itself.
 * - Breadcrumb, `<FilterForm>`, `<ExportButton>`/`<CreateButton>`/`<FilterButton>`
 *   defaults, and the `<Empty>` feedback component are LAYOUT/BUTTONS/FEEDBACK
 *   chrome ported in later waves — NOT referenced here. The `title`/`actions`
 *   props remain the pluggable seams; `actions` defaults to nothing (the button
 *   bar lands when those components exist). The DataTable renders its own empty
 *   state, so `<List>` does not gate on emptiness.
 * - The list surface reads `filter` (chelone's field), not ra's `filterValues`.
 */

import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useListController } from "../../../controller-hooks";
import { ListContextProvider, useListContext } from "../../../form";
import { useTranslate } from "../../../i18n-hooks";
import { useGetResourceLabel } from "../../../label";
import { useResourceContext } from "../../../resource";

export interface ListProps {
  /** Override the ambient resource (defaults to the `<Resource>` context). */
  resource?: string;
  /** Rows-per-page for the initial query. */
  perPage?: number;
  children?: ReactNode;
  /** Element/component wrapping the children (defaults to `"div"`). */
  component?: React.ElementType;
  /** Header actions (create/export/filter buttons); nothing by default. */
  actions?: ReactElement | false;
  /** Header title. A string/element renders as an `<h2>`; `false` omits it. */
  title?: ReactNode | string | false;
  className?: string;
}

/**
 * A list page: fetches records via `useListController`, publishes them into the
 * `ListContext`, and renders a title + actions + children (usually a
 * `<DataTable>`).
 *
 * @example
 * import { DataTable, List } from "@chelone/react";
 *
 * export const PostList = () => (
 *   <List>
 *     <DataTable>
 *       <DataTable.Col source="id" />
 *       <DataTable.Col source="title" />
 *     </DataTable>
 *   </List>
 * );
 */
function List(props: ListProps) {
  const { resource: resourceProp, perPage, children, ...viewProps } = props;
  const contextResource = useResourceContext();
  const resource = resourceProp ?? contextResource;
  if (!resource) {
    throw new Error(
      "The List component must be used within a ResourceContextProvider or given a `resource` prop",
    );
  }
  const controller = useListController(resource, { perPage });

  return (
    <ListContextProvider value={controller}>
      <ListView {...viewProps}>{children}</ListView>
    </ListContextProvider>
  );
}

interface ListViewProps {
  children?: ReactNode;
  component?: React.ElementType;
  actions?: ReactElement | false;
  title?: ReactNode | string | false;
  className?: string;
}

/** The list layout: title + actions header, then the children. @internal */
function ListView(props: ListViewProps) {
  const { component: Content = "div", title, children, actions } = props;
  const translate = useTranslate();
  const resource = useResourceContext();
  if (!resource) {
    throw new Error(
      "The ListView component must be used within a ResourceContextProvider",
    );
  }
  const getResourceLabel = useGetResourceLabel();
  const resourceLabel = getResourceLabel(resource, 2);
  const finalTitle =
    title !== undefined
      ? title
      : translate("chelone.page.list", { name: resourceLabel });
  // Subscribe so the view re-renders as the controller resolves (parity with
  // shadmin's `useListContext` read; the value is also what children consume).
  useListContext();

  return (
    <>
      <div className="flex justify-between items-start flex-wrap gap-2 my-2">
        {title !== false && (
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            {finalTitle}
          </h2>
        )}
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <Content className={cn("my-2", props.className)}>{children}</Content>
    </>
  );
}

export { List, ListView, type ListViewProps };
