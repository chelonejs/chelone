// A subpath entry, not part of the barrel: the add-on imports the optional
// `recharts` peer, which the main entry must load without.
export {
  TrendChart,
  type TrendChartProps,
} from "./components/charts/trend-chart";
