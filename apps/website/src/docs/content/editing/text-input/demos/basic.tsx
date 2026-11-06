import { TextInput } from "@chelone/react";

export const mode = "input";

/** `<TextInput>` shows a labelled "Title" field filled with the post's title. */
export default function TextInputDemo() {
  return (
    <div className="w-full max-w-sm">
      <TextInput source="title" defaultValue="On Computable Numbers" />
    </div>
  );
}
