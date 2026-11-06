import { PhoneField, RecordContextProvider } from "@chelone/react";

export const mode = "record";

/** `<PhoneField>` formats a phone number as a clickable telephone link. */
export default function PhoneFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, phone: "+14155552671" }}>
      <PhoneField source="phone" />
    </RecordContextProvider>
  );
}
