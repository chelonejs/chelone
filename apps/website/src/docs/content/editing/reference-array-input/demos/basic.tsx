import { AutocompleteArrayInput, ReferenceArrayInput } from "@chelone/react";

export const mode = "input";

/** `<ReferenceArrayInput>` edits a post's `author_ids` against the `authors` resource, with Ada Lovelace and Grace Hopper already picked. */
export default function ReferenceArrayInputDemo() {
  return (
    <div className="w-full max-w-sm">
      <ReferenceArrayInput source="author_ids" reference="authors">
        <AutocompleteArrayInput defaultValue={[1, 3]} />
      </ReferenceArrayInput>
    </div>
  );
}
