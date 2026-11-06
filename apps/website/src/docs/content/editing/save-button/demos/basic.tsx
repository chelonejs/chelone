import { SaveButton, TextInput } from "@chelone/react";

export const mode = "input";

/** `<SaveButton>` submits the create form around it, which holds a filled title field. */
export default function SaveButtonDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <TextInput source="title" defaultValue="On Computable Numbers" />
      <SaveButton />
    </div>
  );
}
