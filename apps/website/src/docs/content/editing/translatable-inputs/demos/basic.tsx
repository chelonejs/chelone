import { TextInput, TranslatableInputs } from "@chelone/react";

export const mode = "input";

/** `<TranslatableInputs>` shows an EN and FR tab, each holding its own "Name" input. */
export default function TranslatableInputsDemo() {
  return (
    <div className="w-full max-w-sm">
      <TranslatableInputs locales={["en", "fr"]}>
        <TextInput source="name" />
      </TranslatableInputs>
    </div>
  );
}
