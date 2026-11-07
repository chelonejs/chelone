import { BooleanField } from "@chelone/react";

export const mode = "record";

/** `<BooleanField>` shows the record's `published` flag as a check / cross. */
export default function BooleanFieldDemo() {
  return <BooleanField source="published" />;
}
