import { RecordContextProvider, SubscriptionPlanField } from "@chelone/react";

export const mode = "record";

const plans = [
  { id: "free", name: "Free", price: 0, currency: "USD", interval: "month" },
  { id: "pro", name: "Pro", price: 29, currency: "USD", interval: "month" },
  { id: "team", name: "Team", price: 99, currency: "USD", interval: "month" },
] as const;

/** `<SubscriptionPlanField>` looks the plan up by id and shows its name and price in a badge. */
export default function SubscriptionPlanFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, plan: "pro" }}>
      <SubscriptionPlanField source="plan" plans={plans} />
    </RecordContextProvider>
  );
}
