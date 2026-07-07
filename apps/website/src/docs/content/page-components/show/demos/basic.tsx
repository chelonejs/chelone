import {
  BooleanField,
  NumberField,
  RecordField,
  ReferenceField,
  Show,
  TextField,
} from "@chelone/react";

// The Show view fetches record id=1 explicitly (no route param in the preview).
export const mode = "view";

/** A `<Show>` view: each `<RecordField>` labels and renders one field of the
 *  fetched record, reading it straight from the record context. */
export default function ShowBasicDemo() {
  return (
    <Show id={1}>
      <RecordField source="title" />
      <RecordField source="body" />
      <RecordField label="Author">
        <ReferenceField source="author_id" reference="authors">
          <TextField source="name" />
        </ReferenceField>
      </RecordField>
      <RecordField label="Views">
        <NumberField source="views" />
      </RecordField>
      <RecordField label="Published">
        <BooleanField source="published" />
      </RecordField>
    </Show>
  );
}
