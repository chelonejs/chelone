import { TrendChart } from "@chelone/react/charts";

const visits = [
  { day: "Mon", visits: 420 },
  { day: "Tue", visits: 510 },
  { day: "Wed", visits: 480 },
  { day: "Thu", visits: 630 },
  { day: "Fri", visits: 720 },
  { day: "Sat", visits: 560 },
  { day: "Sun", visits: 390 },
];

/** `<TrendChart>` follows one number across the days: a smooth line with the area under it filled. */
export default function TrendChartDemo() {
  return (
    <TrendChart
      className="w-full max-w-xl"
      title="Visits this week"
      data={visits}
      xField="day"
      yField="visits"
      area
      smooth
    />
  );
}
