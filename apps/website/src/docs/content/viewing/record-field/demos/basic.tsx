import { BooleanField, NumberField, RecordField } from "@chelone/react";

// A bare field wrapper reads the ambient record.
export const mode = "record";

/** `<RecordField>` puts a label above one value: `source` reads it off the record, `field` renders it through another field, and children render inside the label. */
export default function RecordFieldDemo() {
  return (
    <div className="flex flex-col gap-3">
      <RecordField source="title" label="Title" />
      <RecordField source="views" label="Views" field={NumberField} />
      <RecordField label="Published" variant="inline">
        <BooleanField source="published" />
      </RecordField>
    </div>
  );
}
