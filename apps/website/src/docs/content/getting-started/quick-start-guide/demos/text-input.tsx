import { TextInput } from "@chelone/react";

// An input registers into an ambient form — render under a form context.
export const mode = "input";

/** `<TextInput>` renders a labelled text field bound to `title`. */
export default function TextInputDemo() {
  return <TextInput source="title" />;
}
