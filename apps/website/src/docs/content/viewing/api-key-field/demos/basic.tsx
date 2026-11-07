import { ApiKeyField, RecordContextProvider } from "@chelone/react";

export const mode = "record";

const record = {
  id: 1,
  apiKey: "ck_live_4f9a21c7d83b",
  scopes: ["read", "write"],
  lastUsedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
};

/** `<ApiKeyField>` masks all but the last four characters, with buttons to reveal and copy the key, its scopes and when it was last used. */
export default function ApiKeyFieldDemo() {
  return (
    <RecordContextProvider value={record}>
      <ApiKeyField
        source="apiKey"
        scopesSource="scopes"
        lastUsedSource="lastUsedAt"
      />
    </RecordContextProvider>
  );
}
