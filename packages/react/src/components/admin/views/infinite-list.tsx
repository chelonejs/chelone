/**
 * `<InfiniteList>`: `<List>` on `useInfiniteListController`. It takes the same
 * props and renders the same `ListView`; the list context it publishes also
 * carries `fetchNextPage`, `isFetchingNextPage` and a `data` that grows with
 * each loaded page, which `<InfinitePagination>` reads.
 */

import type { ListContextValue } from "../../../form";
import { ListContextProvider } from "../../../form";
import { useInfiniteListController } from "../../../infinite-hooks";
import { useResourceContext } from "../../../resource";
import { type ListProps, ListView } from "./list";

type InfiniteListProps = ListProps;

/**
 * A list page that loads its rows page by page. Put an `<InfinitePagination>`
 * among the children to load more on demand.
 *
 * @example
 * import { DataTable, InfiniteList, InfinitePagination } from "@chelone/react";
 *
 * export const PostList = () => (
 *   <InfiniteList>
 *     <DataTable>
 *       <DataTable.Col source="title" />
 *     </DataTable>
 *     <InfinitePagination />
 *   </InfiniteList>
 * );
 */
function InfiniteList(props: InfiniteListProps) {
  const { resource: resourceProp, perPage, children, ...viewProps } = props;
  const contextResource = useResourceContext();
  const resource = resourceProp ?? contextResource;
  if (!resource) {
    throw new Error(
      "The InfiniteList component must be used within a ResourceContextProvider or given a `resource` prop",
    );
  }
  const controller = useInfiniteListController(resource, { perPage });

  return (
    <ListContextProvider value={controller as unknown as ListContextValue}>
      <ListView {...viewProps}>{children}</ListView>
    </ListContextProvider>
  );
}

export { InfiniteList, type InfiniteListProps };
