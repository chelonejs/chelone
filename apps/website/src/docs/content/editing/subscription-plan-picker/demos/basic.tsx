import { SubscriptionPlanPicker } from "@chelone/react";

export const mode = "input";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "USD",
    interval: "month",
    features: ["1 project"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 12,
    currency: "USD",
    interval: "month",
    features: ["Unlimited projects", "Priority support"],
  },
  {
    id: "team",
    name: "Team",
    price: 120,
    currency: "USD",
    interval: "year",
    features: ["Everything in Pro", "Shared workspaces"],
  },
] as const;

/** `<SubscriptionPlanPicker>` shows three plan cards, with "Pro" selected and marked as recommended. */
export default function SubscriptionPlanPickerDemo() {
  return (
    <SubscriptionPlanPicker
      source="plan"
      plans={plans}
      recommendedPlanId="pro"
      defaultValue="pro"
    />
  );
}
