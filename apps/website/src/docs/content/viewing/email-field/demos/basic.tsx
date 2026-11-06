import { EmailField, RecordContextProvider } from "@chelone/react";

export const mode = "record";

/** An email address displayed as a clickable mailto link. */
export default function EmailFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, email: "ada@example.com" }}>
      <EmailField source="email" />
    </RecordContextProvider>
  );
}
