/**
 * A panel that plays "another user". Each button acts through the same wrapped
 * provider and lock provider as the app, so the events reach the open views
 * the way a second browser's would.
 */

import type { Identifier } from "@chelone/core";
import { useNotify } from "@chelone/react";
import { dataProvider, locks } from "./realtime";

const buttonClass =
  "rounded-md border px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground";

export interface SimulateOtherUserProps {
  /** The post the lock button takes. Defaults to the first seeded post. */
  postId?: Identifier;
}

export function SimulateOtherUser({ postId = 1 }: SimulateOtherUserProps) {
  const notify = useNotify();

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

  const lockPost = () =>
    locks
      .lock("posts", { id: postId, identity: "alice" })
      .catch((error: Error) => notify(error.message, { type: "error" }));

  return (
    <div className="flex items-center gap-2" data-testid="simulate-other-user">
      <button type="button" className={buttonClass} onClick={addPost}>
        Another user adds a post
      </button>
      <button type="button" className={buttonClass} onClick={lockPost}>
        Another user locks post {String(postId)}
      </button>
    </div>
  );
}
