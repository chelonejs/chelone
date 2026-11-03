/**
 * `FieldProps` — the shared prop contract every read-only display field accepts
 * (parity: shadmin's `lib/field-types`, itself a slim of ra-core's
 * `BaseFieldProps` + presentational field props).
 *
 * Chelone rebridge notes:
 * - shadmin extended ra-core's `BaseFieldProps` (which typed `source` as
 *   `ExtractRecordPaths<RecordType>` for path autocompletion). Chelone core does
 *   not carry the `ExtractRecordPaths` / `HintedString` path-inference machinery,
 *   so `source` is a plain `string` — the same type chelone's `useFieldValue`
 *   consumes. Runtime parity is unchanged; only IDE source autocompletion is lost.
 * - The DataTable-layout keys (`cellClassName`, `headerClassName`, `sortable`,
 *   `sortBy`, `sortByOrder`, `textAlign`) are carried verbatim so a field's props
 *   surface stays call-site-compatible with shadmin even though the DataTable
 *   consumer is not part of this wave.
 */

import type { LooseRecord } from "@chelone/core";
import type { ReactNode } from "react";

export type SortOrder = "ASC" | "DESC";
export type TextAlign = "left" | "center" | "right" | "justify" | "inherit";

export interface FieldProps<RecordType extends LooseRecord = LooseRecord> {
  /** Name of the property to display (dot/bracket path). */
  source: string;

  /** The record to render. Defaults to the ambient `RecordContext` value. */
  record?: RecordType;

  /** The resource name. Defaults to the ambient `ResourceContext` value. */
  resource?: string;

  /** A class name to apply to the root element. */
  className?: string;

  /** A class name to apply to the cell element when used inside `<DataTable>`. */
  cellClassName?: string;

  /** A class name to apply to the header cell element when used inside `<DataTable>`. */
  headerClassName?: string;

  /**
   * Label to use as column header when using `<DataTable>` or `<SimpleShowLayout>`.
   * Defaults to the capitalized field name. Set to `false` to disable the label.
   */
  label?: ReactNode | false;

  /** Disable the header click handler when used inside `<DataTable>`. */
  sortable?: boolean;

  /** The field to sort by when this column head is clicked, if sortable. */
  sortBy?: string;

  /** The order used for sorting when this column head is clicked, if sortable. */
  sortByOrder?: SortOrder;

  /** The text alignment for the cell content, when used inside `<DataTable>`. */
  textAlign?: TextAlign;

  /**
   * The node to display when the field value is empty. Defaults to nothing.
   * A string is translated; a ReactNode renders as-is.
   */
  empty?: ReactNode;
}
