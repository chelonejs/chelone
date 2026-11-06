import { CurrencyField, RecordContextProvider } from "@chelone/react";

export const mode = "record";

/** `<CurrencyField>` formats a price in US dollars. */
export default function CurrencyFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, price: 1234.5 }}>
      <CurrencyField source="price" currency="USD" />
    </RecordContextProvider>
  );
}
