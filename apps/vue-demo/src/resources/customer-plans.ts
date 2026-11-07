import type { SubscriptionPlan } from "@chelone/vue";

/** The plans a customer can be on, in the order the picker lays them out. */
export const plans: readonly SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "USD",
    interval: "month",
    features: ["1 project", "Community support"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    currency: "USD",
    interval: "month",
    features: ["Unlimited projects", "Email support"],
  },
  {
    id: "team",
    name: "Team",
    price: 99,
    currency: "USD",
    interval: "month",
    features: ["Everything in Pro", "Shared workspaces"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 2400,
    currency: "USD",
    interval: "year",
    features: ["Everything in Team", "Dedicated support"],
  },
];
