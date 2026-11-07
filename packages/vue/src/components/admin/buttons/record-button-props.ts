import type { LooseRecord, ResourceRecord } from "@chelone/core";

/** Props the record-scoped link buttons (edit, show, clone) share. */
export interface RecordLinkButtonProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  /** Override the ambient record. */
  record?: TRecord | LooseRecord;
  /** Override the ambient `<Resource>`. */
  resource?: string;
  /** Override the auto-translated label. */
  label?: string;
  /** Extra CSS class appended to the anchor. */
  class?: string;
}
