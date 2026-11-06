import { CurrencyInput } from "@chelone/react";

export const mode = "input";

/** `<CurrencyInput>` shows a US dollar amount with the currency symbol beside it. */
export default function CurrencyInputDemo() {
  return <CurrencyInput source="total" currency="USD" defaultValue={42.5} />;
}
