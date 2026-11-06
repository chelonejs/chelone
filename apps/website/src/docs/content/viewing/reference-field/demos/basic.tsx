import { ReferenceField, TextField } from "@chelone/react";

// A bare field reads the ambient record's foreign key.
export const mode = "record";

/** `<ReferenceField>` follows a post's `author_id` to the author record and renders that author's `name` through a child `<TextField>`. */
export default function ReferenceFieldDemo() {
  return (
    <p className="text-sm">
      Author:{" "}
      <ReferenceField source="author_id" reference="authors">
        <TextField source="name" />
      </ReferenceField>
    </p>
  );
}
