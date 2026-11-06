import { JsonField, RecordContextProvider } from "@chelone/react";

export const mode = "record";

/** A static JSON preview shows `<MonacoJsonField>` content without loading Monaco. */
export default function MonacoJsonFieldDemo() {
  return (
    <RecordContextProvider
      value={{ id: 1, settings: { theme: "dark", notifications: true } }}
    >
      <JsonField source="settings" className="rounded-md border p-4" />
    </RecordContextProvider>
  );
}
