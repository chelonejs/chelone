import { BarChart } from "@chelone/react/charts";

const revenue = [
  { month: "Jan", revenue: 12400 },
  { month: "Feb", revenue: 15800 },
  { month: "Mar", revenue: 14200 },
  { month: "Apr", revenue: 18900 },
  { month: "May", revenue: 21300 },
  { month: "Jun", revenue: 19700 },
];

/** `<BarChart>` draws one bar per month. It fetches nothing: the rows come from the page. */
export default function BarChartDemo() {
  return (
    <BarChart
      className="w-full max-w-xl"
      title="Revenue by month"
      data={revenue}
      xField="month"
      yField="revenue"
    />
  );
}
