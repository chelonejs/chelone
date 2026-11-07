/**
 * The posts waiting for review. Two approvals publish a post, and a rejection
 * asks for a reason. `<ApprovalQueue>` reads the ambient list, so the page
 * builds one with a permanent `in_review` filter: a decided post leaves the
 * queue once the update's refetch lands.
 */

import {
  ApprovalQueue,
  ListContextProvider,
  ResourceContextProvider,
  useListController,
} from "@chelone/react";

export const title = "Approvals";
export const group = "Content";

function PendingPosts() {
  const list = useListController("posts", {
    filter: { status: "in_review" },
    syncWithLocation: false,
  });
  return (
    <ListContextProvider value={list}>
      <ApprovalQueue
        titleSource="title"
        subtitleSource="body"
        required={2}
        pendingValue="in_review"
        approvedValue="published"
      />
    </ListContextProvider>
  );
}

export default function Approvals() {
  return (
    <ResourceContextProvider value="posts">
      <div className="flex max-w-2xl flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
        <PendingPosts />
      </div>
    </ResourceContextProvider>
  );
}
