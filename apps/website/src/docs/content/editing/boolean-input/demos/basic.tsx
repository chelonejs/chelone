import { BooleanInput } from "@chelone/react";

export const mode = "input";

/** `<BooleanInput>` toggles whether a post is published. */
export default function BooleanInputDemo() {
  return <BooleanInput source="published" defaultValue={false} />;
}
