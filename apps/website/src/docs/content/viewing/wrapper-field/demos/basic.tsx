import { Labeled, NumberField, TextField, WrapperField } from "@chelone/react";

export const mode = "record";

/** A post's title and view count grouped under one Publication label. */
export default function WrapperFieldDemo() {
  return (
    <Labeled>
      <WrapperField label="Publication">
        {/* `<WrapperField>` renders no element, and `<Labeled>` stacks its
            children, so the span keeps the fields on one line. */}
        <span>
          <TextField source="title" />
          {" · "}
          <NumberField source="views" /> views
        </span>
      </WrapperField>
    </Labeled>
  );
}
