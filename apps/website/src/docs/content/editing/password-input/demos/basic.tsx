import { PasswordInput } from "@chelone/react";

export const mode = "input";

/** `<PasswordInput>` hides the value behind dots until the reader clicks the eye button. */
export default function PasswordInputDemo() {
  return (
    <div className="w-full max-w-xs">
      <PasswordInput source="password" defaultValue="hunter2!" />
    </div>
  );
}
