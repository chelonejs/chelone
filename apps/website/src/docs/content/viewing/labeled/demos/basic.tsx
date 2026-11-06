import { Labeled, TextField } from "@chelone/react";

export const mode = "record";

/** `<Labeled>` adds a title label above a post's text field. */
export default function LabeledDemo() {
  return (
    <Labeled>
      <TextField source="title" />
    </Labeled>
  );
}
