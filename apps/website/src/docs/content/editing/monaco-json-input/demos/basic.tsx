import { JsonField, RecordContextProvider } from "@chelone/react";

export const mode = "record";

// The docs site installs no Monaco, so the demo shows the value the editor
// would hold rather than the editor itself.
/** `<MonacoJsonInput>` edits a settings object as JSON; here it is the plain text of that object. */
export default function MonacoJsonInputDemo() {
  return (
    <RecordContextProvider
      value={{
        id: 1,
        settings: {
          theme: "dark",
          retries: 3,
          channels: ["email", "webhook"],
        },
      }}
    >
      <JsonField
        source="settings"
        className="w-full max-w-md rounded-md border p-4 font-mono text-xs"
      />
    </RecordContextProvider>
  );
}
