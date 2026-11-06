// A subpath entry, not part of the barrel: the add-on imports the optional
// `@unovis/vue` and `@unovis/ts` peers, which the main entry must load
// without.

export {
  type BarChartProps,
  default as BarChart,
} from "./components/charts/bar-chart.vue";
export {
  type DonutChartProps,
  default as DonutChart,
} from "./components/charts/donut-chart.vue";
export {
  default as TrendChart,
  type TrendChartProps,
} from "./components/charts/trend-chart.vue";
