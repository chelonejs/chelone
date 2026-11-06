import { BadgeField, RecordContextProvider } from "@chelone/react";

export const mode = "record";

/** `<BadgeField>` shows a post's publication status in a badge. */
export default function BadgeFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, status: "Published" }}>
      <BadgeField source="status" />
    </RecordContextProvider>
  );
}
