import { InPlaceEditor, RecordField, Show } from "@chelone/react";

export const mode = "view";

/** Click the title to edit it; Enter or blur saves. */
export default function InPlaceEditorDemo() {
  return (
    <Show id={1} title={false}>
      <RecordField label="Title">
        <InPlaceEditor source="title" />
      </RecordField>
    </Show>
  );
}
