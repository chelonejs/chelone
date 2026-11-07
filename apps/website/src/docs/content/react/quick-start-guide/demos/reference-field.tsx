import { ReferenceField, TextField } from "@chelone/react";

// Resolves the record's `author_id` FK against the `authors` resource.
export const mode = "record";

/** `<ReferenceField>` follows `author_id` → the author's `name`. */
export default function ReferenceFieldDemo() {
  return (
    <ReferenceField source="author_id" reference="authors">
      <TextField source="name" />
    </ReferenceField>
  );
}
