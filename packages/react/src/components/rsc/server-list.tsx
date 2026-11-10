/**
 * A list rendered by a React Server Component from one loaded page. Its state
 * lives in the URL, so every sort and page change is a link to a new URL, and
 * the server renders the page that URL names.
 */

import {
  createI18n,
  defaultRecordRepresentation,
  englishMessages,
  formatFieldText,
  type GetListParams,
  getAtPath,
  type Identifier,
  isIdentifier,
  type LooseRecord,
  type PageInfo,
  type ResourceRecord,
  type SourceProp,
  type TranslateParamValues,
} from "@chelone/core";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import type { ServerI18n } from "./read-field-value";
import { hrefOf, readUrlState } from "./server-list-href";
import { ServerListLink } from "./server-list-link";
import { ServerTextField } from "./server-scalar-fields";

/** The referenced records of a page, by id, one map per reference key. */
type ServerListReferences = {
  [key: string]: ReadonlyMap<Identifier, ResourceRecord>;
};

/** A loaded list page: what `loadServerListPage` returns. */
interface ServerListPageData<
  RecordType extends ResourceRecord,
  TReferences extends ServerListReferences,
> {
  /** The `getList` params the page was fetched with. */
  params: GetListParams;
  data: RecordType[];
  total?: number;
  pageInfo?: PageInfo;
  references: TReferences;
}

/** A column that prints a value of the row's record. */
interface ServerListFieldColumn<RecordType extends ResourceRecord> {
  /** The path the column reads, and sorts by. */
  source: SourceProp<RecordType>;
  label: string;
  /** Make the header a link that sorts by `source`. */
  sortable?: boolean;
  /** What the cell renders. Defaults to a `ServerTextField` at `source`. */
  cell?: (record: RecordType) => ReactNode;
  reference?: false;
}

/** The record a reference map holds. */
type ReferencedRecord<TMap> =
  TMap extends ReadonlyMap<Identifier, infer TRecord> ? TRecord : never;

/** A column that prints the record a key of `page.references` points at. */
type ServerListReferenceColumn<TReferences extends ServerListReferences> = {
  [TKey in keyof TReferences & string]: {
    /** A key of `page.references`. */
    source: TKey;
    label: string;
    reference: true;
    /** Make the header a link that sorts by `source`. */
    sortable?: boolean;
    /**
     * The path of the referenced record to print. Defaults to
     * `defaultRecordRepresentation`.
     */
    representation?: SourceProp<ReferencedRecord<TReferences[TKey]>>;
  };
}[keyof TReferences & string];

type ServerListColumn<
  RecordType extends ResourceRecord,
  TReferences extends ServerListReferences,
> = ServerListFieldColumn<RecordType> | ServerListReferenceColumn<TReferences>;

interface ServerListProps<
  RecordType extends ResourceRecord = LooseRecord,
  TReferences extends ServerListReferences = ServerListReferences,
> {
  /** The page to render, as `loadServerListPage` returns it. */
  page: ServerListPageData<RecordType, TReferences>;
  /** The columns, in order. */
  columns: NoInfer<ServerListColumn<RecordType, TReferences>>[];
  /** The list's pathname: every sort and page link is this path plus its query. */
  path: string;
  /** Translates the pagination and no-results text. English without one. */
  i18n?: ServerI18n;
  /** What the last cell of each row renders. */
  rowActions?: (record: NoInfer<RecordType>) => ReactNode;
  /** A class name to apply to the wrapper. */
  className?: string;
}

const english: ServerI18n = createI18n({
  locale: "en",
  messages: { en: englishMessages },
});

/** `key` through `i18n`, with the English message as the default text. */
function translate(
  i18n: ServerI18n | undefined,
  key: keyof typeof englishMessages,
  params: TranslateParamValues = {},
): string {
  const fallback = english.translate(key, params);
  return i18n ? i18n.translate(key, { _: fallback, ...params }) : fallback;
}

/**
 * What a reference cell prints: per id at `source`, the referenced record's
 * `representation`, else its default representation, else the id itself when
 * the page holds no such record. A to-many key prints its ids comma-separated.
 */
function referenceText(
  record: ResourceRecord,
  source: string,
  references: ReadonlyMap<Identifier, ResourceRecord> | undefined,
  representation: string | undefined,
): string {
  const value = getAtPath(record, source);
  const ids = (Array.isArray(value) ? value : [value]).filter(isIdentifier);
  return ids
    .map((id) => {
      const referenced = references?.get(id);
      if (!referenced) return String(id);
      if (representation === undefined) {
        return String(defaultRecordRepresentation(referenced));
      }
      return formatFieldText(getAtPath(referenced, representation)) ?? "";
    })
    .join(", ");
}

/**
 * Renders one loaded list page as a table, in a React Server Component: a row
 * per record, sortable headers and previous and next links. Every link is a
 * new URL under `path`, so the next state is a new server render.
 *
 * @example
 * import { ServerList } from "@chelone/react/rsc";
 *
 * <ServerList
 *   page={await loadServerListPage(ctx, "posts", { search, references: { author_id: "users" } })}
 *   path="/posts"
 *   columns={[
 *     { source: "title", label: "Title", sortable: true },
 *     { source: "author_id", label: "Author", reference: true, representation: "name" },
 *   ]}
 * />
 */
function ServerList<
  RecordType extends ResourceRecord = LooseRecord,
  TReferences extends ServerListReferences = ServerListReferences,
>({
  page,
  columns,
  path,
  i18n,
  rowActions,
  className,
}: ServerListProps<RecordType, TReferences>) {
  const { page: current, perPage, primary, state } = readUrlState(page.params);

  const lastPage =
    page.total === undefined
      ? undefined
      : Math.max(1, Math.ceil(page.total / perPage));
  // Past the end, previous goes to the last page that holds records.
  const previousPage =
    lastPage !== undefined && current > lastPage ? lastPage : current - 1;
  const hasNext =
    page.data.length > 0 &&
    (page.total === undefined
      ? page.pageInfo?.hasNextPage === true
      : current * perPage < page.total);

  const linkClass =
    "inline-flex h-8 items-center rounded-md px-3 text-sm hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-50";
  const pageLinks = (
    <>
      <ServerListLink
        className={linkClass}
        href={
          current > 1 ? hrefOf(path, state, { page: previousPage }) : undefined
        }
      >
        {translate(i18n, "chelone.navigation.previous")}
      </ServerListLink>
      <ServerListLink
        className={linkClass}
        href={hasNext ? hrefOf(path, state, { page: current + 1 }) : undefined}
      >
        {translate(i18n, "chelone.navigation.next")}
      </ServerListLink>
    </>
  );

  if (page.data.length === 0) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <p className="py-4 text-sm text-muted-foreground">
          {translate(i18n, "chelone.navigation.no_results")}
        </p>
        {current > 1 && (
          <nav
            aria-label="pagination"
            className="flex items-center justify-end gap-2"
          >
            {pageLinks}
          </nav>
        )}
      </div>
    );
  }

  const offsetBegin = (current - 1) * perPage + 1;
  const offsetEnd = offsetBegin + page.data.length - 1;
  const range =
    page.total === undefined
      ? translate(i18n, "chelone.navigation.partial_page_range_info", {
          offsetBegin,
          offsetEnd,
        })
      : translate(i18n, "chelone.navigation.page_range_info", {
          offsetBegin,
          offsetEnd,
          total: page.total,
        });

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => {
              const sorted =
                primary?.field === column.source ? primary.order : undefined;
              if (!column.sortable) {
                return (
                  <TableHead key={`${column.source}:${column.label}`}>
                    {column.label}
                  </TableHead>
                );
              }
              return (
                <TableHead
                  key={`${column.source}:${column.label}`}
                  aria-sort={
                    sorted === undefined
                      ? "none"
                      : sorted === "ASC"
                        ? "ascending"
                        : "descending"
                  }
                >
                  <ServerListLink
                    className="hover:underline"
                    href={hrefOf(path, state, {
                      sort: {
                        field: column.source,
                        order: sorted === "ASC" ? "DESC" : "ASC",
                      },
                      page: 1,
                    })}
                  >
                    {column.label}
                    {sorted && (
                      <span aria-hidden="true">
                        {sorted === "ASC" ? " ↑" : " ↓"}
                      </span>
                    )}
                  </ServerListLink>
                </TableHead>
              );
            })}
            {rowActions && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {page.data.map((record) => (
            <TableRow key={record.id}>
              {columns.map((column) => (
                <TableCell key={`${column.source}:${column.label}`}>
                  {column.reference ? (
                    referenceText(
                      record,
                      column.source,
                      page.references[column.source],
                      column.representation,
                    )
                  ) : column.cell ? (
                    column.cell(record)
                  ) : (
                    <ServerTextField record={record} source={column.source} />
                  )}
                </TableCell>
              ))}
              {rowActions && <TableCell>{rowActions(record)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <nav
        aria-label="pagination"
        className="flex items-center justify-end gap-2"
      >
        <span className="text-sm text-muted-foreground">{range}</span>
        {pageLinks}
      </nav>
    </div>
  );
}

export {
  ServerList,
  type ServerListColumn,
  type ServerListFieldColumn,
  type ServerListPageData,
  type ServerListProps,
  type ServerListReferenceColumn,
  type ServerListReferences,
};
