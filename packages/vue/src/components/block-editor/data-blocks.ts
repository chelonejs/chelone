import { recordListBlockSpec, referenceRecordBlockSpec } from "@chelone/core";
import { DatabaseIcon, TableIcon } from "./block-icons";
import { defineBlock } from "./block-nodes";
import { type AttrsOf, keyedByResource } from "./data-block-parts";
import RecordListBlock from "./record-list-block.vue";
import RecordListConfig from "./record-list-config.vue";
import ReferenceRecordBlock from "./reference-record-block.vue";
import ReferenceRecordConfig from "./reference-record-config.vue";

export type ReferenceRecordAttrs = AttrsOf<typeof referenceRecordBlockSpec>;
export type RecordListAttrs = AttrsOf<typeof recordListBlockSpec>;

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

/** The data blocks: reference record and record list. */
export const dataBlocks = [referenceRecordBlock, recordListBlock];
