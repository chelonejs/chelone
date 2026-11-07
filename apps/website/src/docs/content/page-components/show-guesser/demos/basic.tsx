import { ShowGuesser } from "@chelone/react";

// The Show view fetches record id=1 explicitly (no route param in the preview).
export const mode = "view";

/** A `<ShowGuesser>`: one labelled row per field of the `posts` schema. */
export default function ShowGuesserBasicDemo() {
  return <ShowGuesser id={1} enableLog={false} />;
}
