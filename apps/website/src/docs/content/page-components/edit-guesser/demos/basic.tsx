import { EditGuesser } from "@chelone/react";

// The Edit view fetches record id=1 explicitly (no route param in the preview).
export const mode = "view";

/** An `<EditGuesser>`: one input per field of the `posts` schema, validated
 *  against it on save. */
export default function EditGuesserBasicDemo() {
  return <EditGuesser id={1} enableLog={false} />;
}
