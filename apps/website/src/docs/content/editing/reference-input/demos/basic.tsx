import { AutocompleteInput, ReferenceInput } from "@chelone/react";

export const mode = "input";

/** `<ReferenceInput>` edits a post's `author_id` by searching the `authors` resource, with Ada Lovelace already picked. */
export default function ReferenceInputDemo() {
  return (
    <div className="w-full max-w-sm">
      <ReferenceInput source="author_id" reference="authors">
        <AutocompleteInput defaultValue={1} />
      </ReferenceInput>
    </div>
  );
}
