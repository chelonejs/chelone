import {
  ListContextProvider,
  ListNoResults,
  SimpleList,
  useListController,
} from "@chelone/react";
import type { PreviewPost } from "../../../../mdx/preview-fixtures";

/** `<ListNoResults>` offers to clear a search that matches no posts. */
export default function ListNoResultsDemo() {
  const controller = useListController("posts", {
    filterDefaultValues: { q: "No matching posts" },
    syncWithLocation: false,
  });

  return (
    <ListContextProvider value={controller}>
      <SimpleList<PreviewPost>
        primaryText={(post) => post.title}
        linkType={false}
        empty={<ListNoResults />}
      />
    </ListContextProvider>
  );
}
