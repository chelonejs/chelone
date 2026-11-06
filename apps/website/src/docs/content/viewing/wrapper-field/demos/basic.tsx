import { Labeled, NumberField, TextField, WrapperField } from "@chelone/react";

export const mode = "record";

/** A post's title and view count grouped under one Publication label. */
export default function WrapperFieldDemo() {
  return (
    <Labeled>
      <WrapperField label="Publication">
        <TextField source="title" />
        {" · "}
        <NumberField source="views" /> views
      </WrapperField>
    </Labeled>
  );
}
