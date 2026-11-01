import { subscribeLiveResource } from "@chelone/core";
import { useEffect } from "react";
import { useCheloneContext } from "../../../context";
import { ResourceContextProvider, useResourceContext } from "../../../resource";
import { List, type ListProps } from "../views/list";

export type ListLiveProps = ListProps;

/**
 * A `<List>` that refetches when a record in its resource changes or the
 * connection returns. Needs a realtime data provider.
 *
 * @example
 * import { DataTable, ListLive } from "@chelone/react";
 *
 * export const PostList = () => (
 *   <ListLive>
 *     <DataTable>
 *       <DataTable.Col source="title" />
 *     </DataTable>
 *   </ListLive>
 * );
 */
function ListLive(props: ListLiveProps) {
  const contextResource = useResourceContext();
  const resource = props.resource ?? contextResource;
  const { dataProvider, queryClient } = useCheloneContext();

  useEffect(() => {
    // `<List>` throws the missing-resource error during this same render.
    if (!resource) return;
    const subscription = subscribeLiveResource(
      { dataProvider, queryClient },
      resource,
    );
    return () => subscription.stop();
  }, [dataProvider, queryClient, resource]);

  const list = <List {...props} />;
  // `<List>` reads the resource prop for its query but `ListView` reads the
  // context, so a prop without a `<Resource>` around it needs the provider.
  if (!resource || resource === contextResource) return list;
  return (
    <ResourceContextProvider value={resource}>{list}</ResourceContextProvider>
  );
}

export { ListLive };
