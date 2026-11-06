import { ColorField, RecordContextProvider } from "@chelone/react";

export const mode = "record";

/** `<ColorField>` displays a blue swatch alongside its hex code. */
export default function ColorFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, color: "#3b82f6" }}>
      <ColorField source="color" />
    </RecordContextProvider>
  );
}
