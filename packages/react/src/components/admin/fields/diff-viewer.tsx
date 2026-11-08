import {
  type DiffStatus,
  diffRecords,
  formatDiffValue,
  type LooseRecord,
  type RecordDiffRow,
  type ResourceRecord,
  type SourceProp,
} from "@chelone/core";
import { ArrowRightIcon } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { useTranslateLabel } from "../../../label";

type DiffViewerMode = "side-by-side" | "inline";

/**
 * Shows what changed between two versions of a record, one row per field.
 * Side by side is a table with the field, its before value and its after
 * value; inline is a list that shows the removed and added value in one line.
 * Each row has a `data-status` and a visually hidden status word, and every
 * value renders as text unless a `formatters` entry says otherwise.
 *
 * @example
 * <DiffViewer before={v1} after={v2} sources={["title", "body"]} mode="inline" />
 */
function DiffViewer<TRecord extends ResourceRecord = LooseRecord>({
  before,
  after,
  sources,
  labels,
  formatters,
  mode = "side-by-side",
  resource,
  className,
}: DiffViewerProps<TRecord>) {
  const translate = useTranslate();
  const translateLabel = useTranslateLabel();
  const rows = useMemo(
    () => diffRecords<TRecord>(before, after, sources),
    [before, after, sources],
  );

  const empty = translate("chelone.diff_viewer.empty", { _: "(empty)" });
  const renderValue: RenderDiffValue = (source, value) => {
    const formatter = formatters?.[source];
    const content = formatter ? formatter(value) : formatDiffValue(value);
    return content === "" || content == null || content === false
      ? empty
      : content;
  };
  const labelOf = (source: string): ReactNode =>
    labels?.[source] ?? translateLabel({ source, resource });
  const statusWord = (status: DiffStatus): ReactNode => (
    <span className="sr-only">
      {translate(`chelone.diff_viewer.status.${status}`, { _: status })}
    </span>
  );

  if (mode === "inline") {
    return (
      <ul
        data-slot="diff-viewer"
        data-mode={mode}
        className={cn("flex flex-col gap-2 text-sm", className)}
      >
        {rows.map((row) => (
          <li
            key={row.source}
            data-source={row.source}
            data-status={row.status}
            className="flex flex-wrap items-baseline gap-x-2"
          >
            <span className="font-medium">{labelOf(row.source)}</span>
            {statusWord(row.status)}
            {inlineValues(row, renderValue)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <table
      data-slot="diff-viewer"
      data-mode={mode}
      className={cn("w-full border-collapse text-sm", className)}
    >
      <thead>
        <tr className="text-left">
          <th scope="col" className="p-2 font-medium">
            {translate("chelone.diff_viewer.field", { _: "Field" })}
          </th>
          <th scope="col" className="p-2 font-medium">
            {translate("chelone.diff_viewer.before", { _: "Before" })}
          </th>
          <th scope="col" className="p-2 font-medium">
            {translate("chelone.diff_viewer.after", { _: "After" })}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.source}
            data-source={row.source}
            data-status={row.status}
            className="border-t align-top"
          >
            <th scope="row" className="p-2 text-left font-medium">
              {labelOf(row.source)}
              {statusWord(row.status)}
            </th>
            <td className="p-2">
              {row.status === "removed" || row.status === "changed" ? (
                <del className="bg-destructive/10 text-destructive">
                  {renderValue(row.source, row.before)}
                </del>
              ) : (
                renderValue(row.source, row.before)
              )}
            </td>
            <td className="p-2">
              {row.status === "added" || row.status === "changed" ? (
                <ins className="bg-primary/10 no-underline">
                  {renderValue(row.source, row.after)}
                </ins>
              ) : (
                renderValue(row.source, row.after)
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// type-escape: a diffed value is whatever the record held at the source path
type RenderDiffValue = (source: string, value: unknown) => ReactNode;

function inlineValues<TRecord extends ResourceRecord>(
  row: RecordDiffRow<TRecord>,
  renderValue: RenderDiffValue,
): ReactNode {
  switch (row.status) {
    case "added":
      return <ins>{renderValue(row.source, row.after)}</ins>;
    case "removed":
      return <del>{renderValue(row.source, row.before)}</del>;
    case "changed":
      return (
        <>
          <del>{renderValue(row.source, row.before)}</del>
          <ArrowRightIcon aria-hidden="true" className="size-3.5" />
          <ins>{renderValue(row.source, row.after)}</ins>
        </>
      );
    case "unchanged":
      return <span>{renderValue(row.source, row.after)}</span>;
  }
}

interface DiffViewerProps<TRecord extends ResourceRecord = LooseRecord> {
  /** The earlier version. */
  before: TRecord;
  /** The later version. */
  after: TRecord;
  /** Fields to show, in this order. Without it: every top-level key. */
  sources?: readonly SourceProp<TRecord>[];
  /** A label per source, replacing the translated field label. */
  labels?: Partial<Record<string, ReactNode>>;
  /** A renderer per source, replacing the default value text. */
  // type-escape: a formatter receives whatever the record held at the source
  formatters?: Partial<Record<string, (value: unknown) => ReactNode>>;
  /** Table (`side-by-side`, the default) or list (`inline`). */
  mode?: DiffViewerMode;
  /** Resource whose field labels apply. Defaults to the ambient resource. */
  resource?: string;
  className?: string;
}

export { DiffViewer, type DiffViewerMode, type DiffViewerProps };
