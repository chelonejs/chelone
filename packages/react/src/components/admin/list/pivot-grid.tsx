import {
  buildPivotTable,
  formatPivotValue,
  type LooseRecord,
  type PivotAggregator,
  type SourceProp,
} from "@chelone/core";
import { type ReactNode, useMemo } from "react";
import { useListContext } from "../../../form";
import { useLocale, useTranslate } from "../../../i18n-hooks";
import { useTranslateLabel } from "../../../label";
import { cn } from "../../../lib/utils";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { ListNoResults } from "./list-no-results";
import { SimpleListLoading } from "./simple-list-loading";

export interface PivotGridProps<TRecord extends LooseRecord = LooseRecord> {
  /** The field whose values become the rows; a dotted path reads a nested value. */
  rowSource: SourceProp<TRecord>;
  /** The field whose values become the columns. */
  columnSource: SourceProp<TRecord>;
  /** The field the aggregator reads. Unused by `count`. */
  valueSource?: SourceProp<TRecord>;
  /** Default `count`. */
  aggregator?: PivotAggregator;
  /** Prints a number in place of the locale's default text. */
  format?: (value: number) => ReactNode;
  /** Rendered while the list is pending, in place of `SimpleListLoading`. */
  loading?: ReactNode;
  /** Rendered with no records, in place of `ListNoResults`. */
  empty?: ReactNode;
  className?: string;
}

/**
 * The records of the ambient `<List>` as a row by column table with totals. It
 * fetches nothing and sets no `perPage`, so the list must hold every record to
 * pivot.
 */
function PivotGrid<TRecord extends LooseRecord = LooseRecord>({
  rowSource,
  columnSource,
  valueSource,
  aggregator,
  format,
  loading,
  empty,
  className,
}: PivotGridProps<TRecord>) {
  const { data, isPending } = useListContext<TRecord>();
  const translate = useTranslate();
  const translateLabel = useTranslateLabel();
  const locale = useLocale();

  const table = useMemo(
    () =>
      buildPivotTable<LooseRecord>(data ?? [], {
        rowSource,
        columnSource,
        valueSource,
        aggregator,
      }),
    [data, rowSource, columnSource, valueSource, aggregator],
  );

  if (isPending) {
    return loading !== undefined ? (
      loading
    ) : (
      <SimpleListLoading className={className} />
    );
  }
  if (!data || data.length === 0) {
    return empty !== undefined ? empty : <ListNoResults />;
  }

  const noValue = translate("chelone.pivot_grid.no_value", { _: "(none)" });
  const total = translate("chelone.pivot_grid.total", { _: "Total" });
  const keyText = (key: string) => (key === "" ? noValue : key);
  const print = (value: number): ReactNode =>
    format ? format(value) : formatPivotValue(value, locale);

  return (
    <div
      data-slot="pivot-grid"
      className={cn("relative w-full overflow-x-auto", className)}
    >
      <table className="w-full caption-bottom text-sm">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">
              {translateLabel({ source: rowSource })}
            </TableHead>
            {table.columnKeys.map((key) => (
              <TableHead key={key} scope="col">
                {keyText(key)}
              </TableHead>
            ))}
            <TableHead scope="col">{total}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rowKeys.map((rowKey, row) => (
            <TableRow key={rowKey}>
              <TableHead scope="row">{keyText(rowKey)}</TableHead>
              {table.cells[row]?.map((value, column) => (
                <TableCell
                  key={table.columnKeys[column]}
                  data-slot="pivot-grid-cell"
                  data-empty={value === null ? "" : undefined}
                >
                  {value === null ? null : print(value)}
                </TableCell>
              ))}
              <TableCell data-slot="pivot-grid-total">
                {valueOrNone(table.rowTotals[row], print)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableHead scope="row">{total}</TableHead>
            {table.columnTotals.map((value, column) => (
              <TableCell
                key={table.columnKeys[column]}
                data-slot="pivot-grid-total"
              >
                {valueOrNone(value, print)}
              </TableCell>
            ))}
            <TableCell data-slot="pivot-grid-total">
              {valueOrNone(table.grandTotal, print)}
            </TableCell>
          </TableRow>
        </TableBody>
      </table>
    </div>
  );
}

const valueOrNone = (
  value: number | null | undefined,
  print: (value: number) => ReactNode,
): ReactNode => (value == null ? null : print(value));

export { PivotGrid };
