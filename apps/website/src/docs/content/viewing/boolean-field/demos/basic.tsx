import { BooleanField } from "@chelone/react";

export const mode = "record";

/** `<BooleanField>` shows the current post's published flag as a check or cross. */
export default function BooleanFieldDemo() {
  return <BooleanField source="published" />;
}
