import { Count } from "@chelone/react";

/** `<Count>` shows how many seeded posts are published. */
export default function CountDemo() {
  return (
    <p>
      Published posts: <Count filter={{ published: true }} />
    </p>
  );
}
