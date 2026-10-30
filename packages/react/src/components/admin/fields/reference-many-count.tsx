import type { FilterPayload, Identifier } from "@chelone/core";
import type { ReactNode } from "react";
import type { UnknownRecord } from "@/lib/unknown-types";
import { useGetManyReference } from "../../../hooks";
import { useFieldValue } from "../../../record/use-field-value";

interface ReferenceManyCountProps<
  RecordType extends UnknownRecord = UnknownRecord,
> {
  /** The referenced resource holding the reverse FK (e.g. `"books"`). */
  reference: string;
  /** The FK field on the reference pointing back at this record (e.g. `"author_id"`). */
  target: string;
  /** The field on the current record the `target` matches. Default `"id"`. */
  source?: string;
  /** The record whose id is matched. Defaults to the ambient record. */
  record?: RecordType;
  /** Permanent filter merged into the lookup, so only matching rows are counted. */
  filter?: FilterPayload;
  /** Rendered while the count is loading. Nothing by default. */
  loading?: ReactNode;
  /** Rendered when the lookup rejects. Nothing by default. */
  error?: ReactNode;
  /** A class name applied to the count's `<span>`. */
  className?: string;
}

/**
 * Displays how many rows of `reference` point back at the current record, without
 * loading them.
 *
 * Reads the `total` of a one-row `getManyReference` page, so a cell or header can
 * show a count while the data provider ships a single row. Renders nothing
 * without a record id (and fetches nothing), and nothing when the provider
 * returns no `total`. A `0` total renders as `0`.
 *
 * Rebridge note (chelone): ra-core's `ReferenceManyCount` can also link to the
 * filtered list; this one has no `link` prop and does no number formatting.
 *
 * @example
 * import { List, DataTable, ReferenceManyCount } from '@/components/admin';
 *
 * const AuthorList = () => (
 *   <List>
 *     <DataTable>
 *       <DataTable.Col source="name" />
 *       <DataTable.Col label="Books">
 *         <ReferenceManyCount reference="books" target="author_id" />
 *       </DataTable.Col>
 *     </DataTable>
 *   </List>
 * );
 */
function ReferenceManyCount<RecordType extends UnknownRecord = UnknownRecord>(
  props: ReferenceManyCountProps<RecordType>,
) {
  const {
    reference,
    target,
    source = "id",
    record,
    filter,
    loading = null,
    error: errorElement = null,
    className,
  } = props;

  const id = useFieldValue({ source, record }) as Identifier | null | undefined;

  const { data, isPending, error } = useGetManyReference(
    reference,
    {
      target,
      // Never sent: the query is disabled without an id.
      id: id ?? "",
      pagination: { page: 1, perPage: 1 },
      filter,
    },
    { enabled: id != null },
  );

  if (id == null) {
    return null;
  }

  if (isPending) {
    return loading;
  }

  if (error) {
    return errorElement;
  }

  if (data?.total == null) {
    return null;
  }

  return (
    <span data-slot="reference-many-count" className={className}>
      {data.total}
    </span>
  );
}

export { ReferenceManyCount, type ReferenceManyCountProps };
