import { CommentsThread, Show } from "@chelone/react";

export const mode = "view";

/** Post 1's thread: post a comment, or mark one resolved. */
export default function CommentsThreadDemo() {
  return (
    <Show id={1} title={false}>
      <CommentsThread reference="comments" target="post_id" resolvable />
    </Show>
  );
}
