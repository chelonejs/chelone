import { NumberField } from "@chelone/react";

export const mode = "record";

/** `<NumberField>` formats a post's view count in the US English locale. */
export default function NumberFieldDemo() {
  return <NumberField source="views" locales="en-US" />;
}
