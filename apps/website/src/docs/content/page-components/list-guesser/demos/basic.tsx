import { ListGuesser } from "@chelone/react";

/** A `<ListGuesser>`: no columns are written. They come from the Zod schema
 *  the `posts` resource registers, so they show before any record loads. */
export default function ListGuesserBasicDemo() {
  return <ListGuesser enableLog={false} />;
}
