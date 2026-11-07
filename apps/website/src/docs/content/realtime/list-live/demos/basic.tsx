import { DataTable, ListLive, ListPagination, useCreate } from "@chelone/react";
import { Button } from "@/components/ui/button";

export const mode = "realtime";

/** Writes a post the way a second user's browser would, over the same provider. */
function AddPost() {
  const { mutate } = useCreate("posts");
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        mutate({
          data: {
            title: `Post added at ${new Date().toLocaleTimeString()}`,
            body: "Added by another user.",
            author_id: 1,
            views: 0,
            published: false,
          },
        })
      }
    >
      Another user adds a post
    </Button>
  );
}

/** `<ListLive>` refetches when a record of its resource changes: the pager's
 *  total moves when the button adds a post, with no reload. */
export default function ListLiveDemo() {
  return (
    <ListLive perPage={5} actions={<AddPost />}>
      <DataTable>
        <DataTable.Col source="title" />
        <DataTable.NumberCol source="views" />
      </DataTable>
      <ListPagination />
    </ListLive>
  );
}
