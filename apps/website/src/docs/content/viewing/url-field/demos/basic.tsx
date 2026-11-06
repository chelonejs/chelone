import { RecordContextProvider, UrlField } from "@chelone/react";

export const mode = "record";

/** A website URL displayed as a clickable link. */
export default function UrlFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, website: "https://chelone.dev" }}>
      <UrlField source="website" />
    </RecordContextProvider>
  );
}
