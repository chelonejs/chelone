import { ColorInput, RecordContextProvider } from "@chelone/react";

export const mode = "input";

const record = { id: 1, color: "#3b82f6" };

/** `<ColorInput>` picks a color from a popover or a preset swatch. */
export default function ColorInputDemo() {
  return (
    <RecordContextProvider value={record}>
      <ColorInput
        source="color"
        defaultValue={record.color}
        swatches={["#3b82f6", "#22c55e", "#f97316"]}
      />
    </RecordContextProvider>
  );
}
