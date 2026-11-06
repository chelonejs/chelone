// A subpath entry, not part of the barrel: the add-on imports the optional
// `@unovis/vue` and `@unovis/ts` peers, which the main entry must load
// without.
export {
  default as TrendChart,
  type TrendChartProps,
} from "./components/charts/trend-chart.vue";
