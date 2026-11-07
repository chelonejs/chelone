import {
  ApprovalQueue,
  ListContextProvider,
  useListController,
} from "@chelone/react";

export const mode = "view";

/** The in-review posts. A decided post leaves the queue on the next refetch. */
export default function ApprovalQueueDemo() {
  const list = useListController("posts", {
    filter: { status: "review" },
    syncWithLocation: false,
  });
  return (
    <ListContextProvider value={list}>
      <ApprovalQueue
        titleSource="title"
        subtitleSource="body"
        required={2}
        pendingValue="review"
        approvedValue="published"
      />
    </ListContextProvider>
  );
}
