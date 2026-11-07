import { DonutChart } from "@chelone/react/charts";

const channels = [
  { channel: "Web", orders: 182 },
  { channel: "Mobile app", orders: 96 },
  { channel: "Marketplace", orders: 64 },
  { channel: "In store", orders: 38 },
];

/** `<DonutChart>` splits the total into one slice per row, in the theme's chart colors. */
export default function DonutChartDemo() {
  return (
    <DonutChart
      className="w-full max-w-sm"
      title="Orders by channel"
      data={channels}
      labelField="channel"
      valueField="orders"
    />
  );
}
