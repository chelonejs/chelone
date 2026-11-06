import { RadioButtonGroupInput } from "@chelone/react";

export const mode = "input";

const categories = [
  { id: "computing", name: "Computing" },
  { id: "history", name: "History" },
  { id: "biography", name: "Biography" },
];

/** `<RadioButtonGroupInput>` lays the three categories out as radio buttons, "Computing" checked. */
export default function RadioButtonGroupInputDemo() {
  return (
    <div className="w-full max-w-xs">
      <RadioButtonGroupInput
        source="category"
        choices={categories}
        defaultValue="computing"
      />
    </div>
  );
}
