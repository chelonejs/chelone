import { aggregateChartData, chartBlockSpec } from "@chelone/core";
import { ChartColumnIcon } from "lucide-react";
import { useGetList } from "../../hooks";
import { useTranslate } from "../../i18n-hooks";
import { BarChart } from "../charts/bar-chart";
import { DonutChart } from "../charts/donut-chart";
import { TrendChart } from "../charts/trend-chart";
import {
  type BlockConfigProps,
  type BlockRenderProps,
  defineBlock,
} from "./block-nodes";
import {
  type AttrsOf,
  ChoiceSelect,
  ResourceSelect,
  TextConfig,
  useDataBlockGate,
} from "./data-block-parts";

type ChartAttrs = AttrsOf<typeof chartBlockSpec>;

function ChartView({ attrs }: BlockRenderProps<ChartAttrs>) {
  const { resource, type, category, value, aggregate, perPage } = attrs;
  const configured = resource !== "" && category !== "";
  const { data, isPending, isError } = useGetList(
    resource,
    { pagination: { page: 1, perPage } },
    { enabled: configured },
  );
  const gate = useDataBlockGate(
    "chart",
    { configured, isError },
    {
      empty: "Choose a resource and a category",
      error: "The chart data could not be loaded",
    },
  );
  if (gate) return gate;

  const rows = aggregateChartData(data?.data ?? [], {
    category,
    value,
    aggregate,
  });
  const frame = { data: rows, bare: true, loading: isPending };
  return (
    <div className="my-2">
      {type === "line" ? (
        <TrendChart {...frame} xField="name" yField="value" />
      ) : type === "pie" ? (
        <DonutChart {...frame} labelField="name" valueField="value" />
      ) : (
        <BarChart {...frame} xField="name" yField="value" />
      )}
    </div>
  );
}

function ChartConfig({ attrs, onChange }: BlockConfigProps<ChartAttrs>) {
  const translate = useTranslate();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ResourceSelect
        value={attrs.resource}
        onChange={(resource) => onChange({ resource })}
      />
      <ChoiceSelect
        label={translate("chelone.block_editor.chart.type", {
          _: "Chart type",
        })}
        value={attrs.type}
        choices={[
          {
            value: "bar",
            label: translate("chelone.block_editor.chart.bar", { _: "Bar" }),
          },
          {
            value: "line",
            label: translate("chelone.block_editor.chart.line", { _: "Line" }),
          },
          {
            value: "pie",
            label: translate("chelone.block_editor.chart.pie", { _: "Pie" }),
          },
        ]}
        onChange={(type) => onChange({ type })}
      />
      <TextConfig
        label={translate("chelone.block_editor.chart.category", {
          _: "Category field",
        })}
        value={attrs.category}
        onChange={(category) => onChange({ category })}
      />
      <TextConfig
        label={translate("chelone.block_editor.chart.value", {
          _: "Value field",
        })}
        value={attrs.value}
        onChange={(value) => onChange({ value })}
      />
      <ChoiceSelect
        label={translate("chelone.block_editor.chart.aggregate", {
          _: "Aggregate",
        })}
        value={attrs.aggregate}
        choices={[
          {
            value: "count",
            label: translate("chelone.block_editor.chart.count", {
              _: "Count",
            }),
          },
          {
            value: "sum",
            label: translate("chelone.block_editor.chart.sum", { _: "Sum" }),
          },
          {
            value: "avg",
            label: translate("chelone.block_editor.chart.avg", {
              _: "Average",
            }),
          },
        ]}
        onChange={(aggregate) => onChange({ aggregate })}
      />
    </div>
  );
}

/** A resource's first rows grouped by a category and drawn as a bar, line or pie chart. Needs the optional `recharts` peer. */
export const chartBlock = defineBlock({
  ...chartBlockSpec,
  config: ChartConfig,
  icon: ChartColumnIcon,
  render: ChartView,
});
