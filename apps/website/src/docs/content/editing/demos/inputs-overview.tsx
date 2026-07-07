import { BooleanInput, NumberInput, TextInput } from "@chelone/react";

// Inputs register into an ambient form — render them under a form context.
export const mode = "input";

/** A few inputs bound to the record's fields. Each reads/writes the form store
 *  by `source` and validates against the resource's Zod schema. */
export default function InputsOverviewDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <TextInput source="title" />
      <TextInput source="body" multiline />
      <NumberInput source="views" min={0} />
      <BooleanInput source="published" />
    </div>
  );
}
