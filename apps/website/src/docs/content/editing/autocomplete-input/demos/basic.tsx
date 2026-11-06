import { AutocompleteInput, ReferenceInput } from "@chelone/react";

export const mode = "input";

/** `<AutocompleteInput>` searches the available authors to choose a post's author. */
export default function AutocompleteInputDemo() {
  return (
    <ReferenceInput source="author_id" reference="authors">
      <AutocompleteInput optionText="name" label="Author" />
    </ReferenceInput>
  );
}
