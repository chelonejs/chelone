/**
 * A panel that plays "another user". Each button acts through the same wrapped
 * provider and lock provider as the app, so the events reach the open views
 * the way a second browser's would.
 */

import {
  createPresenceSession,
  type Identifier,
  type PresenceUser,
  presenceTopic,
} from "@chelone/core";
import { useGetLockLive, useNotify } from "@chelone/react";
import { useEffect } from "react";
import { dataProvider, locks } from "./realtime";

const buttonClass =
  "rounded-md border px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground";

export interface SimulateOtherUserProps {
  /** The post the lock button takes. Defaults to the first seeded post. */
  postId?: Identifier;
}

export function SimulateOtherUser({ postId = 1 }: SimulateOtherUserProps) {
  const notify = useNotify();
  const { data: lock } = useGetLockLive("posts", { id: postId });
  const heldByAlice = lock?.identity === "alice";

  const addPost = () =>
    dataProvider.create("posts", {
      data: {
        title: `Post added at ${new Date().toLocaleTimeString()}`,
        body: "Added by another user.",
        author_id: 1,
        views: 0,
        published: false,
      },
    });

  // The same button releases alice's lock, so the demo can always free a post.
  const toggleLock = () =>
    (heldByAlice ? locks.unlock : locks.lock)("posts", {
      id: postId,
      identity: "alice",
    }).catch((error: Error) => notify(error.message, { type: "error" }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={buttonClass} onClick={addPost}>
        Another user adds a post
      </button>
      <button type="button" className={buttonClass} onClick={toggleLock}>
        Another user {heldByAlice ? "unlocks" : "locks"} post {String(postId)}
      </button>
    </div>
  );
}

const alice: PresenceUser = { id: "alice", name: "Alice Smith" };

/**
 * Another user with the post open: it announces itself on the post's presence
 * topic the way a second browser's `<PresenceBar>` would, so the bar shows
 * someone besides you.
 */
export function SimulatedViewer({
  postId,
  user = alice,
}: {
  postId: Identifier;
  user?: PresenceUser;
}) {
  useEffect(() => {
    const session = createPresenceSession({
      dataProvider,
      topic: presenceTopic("posts", postId),
      user,
    });
    session.start();
    return () => session.stop();
  }, [postId, user]);
  return null;
}
