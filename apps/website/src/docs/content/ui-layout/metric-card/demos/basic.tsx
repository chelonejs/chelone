import { MetricCard } from "@chelone/react";
import { CircleDollarSign, ShoppingCart, Users } from "lucide-react";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** `<MetricCard>` is a headline number and its change since the last period: up, down or flat. */
export default function MetricCardDemo() {
  return (
    <div className="grid w-full gap-4 sm:grid-cols-3">
      <MetricCard
        label="Revenue"
        value={48250}
        format={money.format}
        delta={0.124}
        icon={CircleDollarSign}
      />
      <MetricCard
        label="Orders"
        value={312}
        delta={-0.038}
        icon={ShoppingCart}
      />
      <MetricCard
        label="Active customers"
        value={1840}
        delta={0}
        icon={Users}
      />
    </div>
  );
}
