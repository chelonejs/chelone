import { ResettableTextInput } from "@chelone/react";

export const mode = "input";

/** `<ResettableTextInput>` shows a clear button beside a title that already has a value. */
export default function ResettableTextInputDemo() {
  return (
    <div className="w-full max-w-sm">
      <ResettableTextInput
        source="title"
        defaultValue="On Computable Numbers"
      />
    </div>
  );
}
