import { TextField } from "@chelone/react";

// A read-only field reads the ambient record — no props beyond `source`.
export const mode = "record";

/** `<TextField>` renders the current record's `title` ("On Computable Numbers"). */
export default function TextFieldDemo() {
  return <TextField source="title" />;
}
