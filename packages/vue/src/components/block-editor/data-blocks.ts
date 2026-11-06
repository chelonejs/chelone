import {
  chartBlockSpec,
  recordListBlockSpec,
  referenceRecordBlockSpec,
} from "@chelone/core";
import { ChartColumnIcon, DatabaseIcon, TableIcon } from "./block-icons";
import { defineBlock } from "./block-nodes";
import ChartBlock from "./chart-block.vue";
import ChartBlockConfig from "./chart-block-config.vue";
import { type AttrsOf, keyedByResource } from "./data-block-parts";
import RecordListBlock from "./record-list-block.vue";
import RecordListConfig from "./record-list-config.vue";
import ReferenceRecordBlock from "./reference-record-block.vue";
import ReferenceRecordConfig from "./reference-record-config.vue";

export type ReferenceRecordAttrs = AttrsOf<typeof referenceRecordBlockSpec>;
export type RecordListAttrs = AttrsOf<typeof recordListBlockSpec>;
export type ChartAttrs = AttrsOf<typeof chartBlockSpec>;

/** A live record of any resource, as a card of its fields or an inline badge of its title. */
export const referenceRecordBlock = defineBlock({
  ...referenceRecordBlockSpec,
  config: ReferenceRecordConfig,
  icon: DatabaseIcon,
  render: keyedByResource(ReferenceRecordBlock),
});

/** The first rows of a resource, as a table of up to three columns. */
export const recordListBlock = defineBlock({
  ...recordListBlockSpec,
  config: RecordListConfig,
  icon: TableIcon,
  render: keyedByResource(RecordListBlock),
});

/** A resource's first rows grouped by a category and drawn as a bar, line or pie chart. The `/block-editor` entry reaches `@unovis/*` through this block, so it needs those optional peers. */
export const chartBlock = defineBlock({
  ...chartBlockSpec,
  config: ChartBlockConfig,
  icon: ChartColumnIcon,
  render: keyedByResource(ChartBlock),
});

/** The data blocks: reference record, record list and chart. */
export const dataBlocks = [referenceRecordBlock, recordListBlock, chartBlock];
