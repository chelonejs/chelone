import { TextArrayInput } from "@chelone/react";

export const mode = "input";

/** `<TextArrayInput>` shows "react" and "typescript" as removable tags beside a field for typing more. */
export default function TextArrayInputDemo() {
  return (
    <div className="w-full max-w-sm">
      <TextArrayInput
        source="keywords"
        defaultValue={["react", "typescript"]}
      />
    </div>
  );
}
