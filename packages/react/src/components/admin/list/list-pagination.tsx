import type { TranslateParamValues } from "@chelone/core";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { type ReactElement, useEffect } from "react";
import { useTranslate } from "../../../i18n-hooks";
import { cn } from "../../../lib/utils";
import { useListPaginationContext } from "../../../list/list-slice-hooks";
import { buttonVariants } from "../../ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "../../ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

/**
 * Pagination controls for a `<List>`: a range indicator, page-number buttons
 * with ellipsis for long lists, prev/next, and a rows-per-page select.
 *
 * Ported from shadmin, rewired off chelone's `useListPaginationContext` (a slice
 * of the single `useListContext`). Chelone divergences: no ra `<Translate>`
 * component (uses `useTranslate`); reads `total`/`page`/`perPage`/paging actions
 * off the chelone list-controller result.
 *
 * When the total is known, shows page numbers ("1-25 of 312"). When unknown
 * (cursor/infinite providers), shows a simplified range only ("1-25"). Returns
 * `null` when the list is empty (total === 0).
 */
interface ListPaginationProps {
  actions?: ReactElement;
  rowsPerPageOptions?: number[];
  className?: string;
}

function ListPagination({
  actions,
  rowsPerPageOptions = [5, 10, 25, 50],
  className,
}: ListPaginationProps) {
  const translate = useTranslate();
  const {
    hasPreviousPage,
    hasNextPage,
    page,
    perPage,
    setPerPage,
    total,
    setPage,
  } = useListPaginationContext();

  // Partial pagination = total is unknown (cursor-based / infinite providers).
  const isPartial = total == null;

  // Out-of-bounds guard: if the current page is beyond the last page, reset to 1.
  const totalPages =
    !isPartial && total > 0 ? Math.ceil(total / perPage) : undefined;
  useEffect(() => {
    if (totalPages != null && page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages, setPage]);
  if (totalPages != null && page > totalPages) {
    return null;
  }

  // When the total is known and equals 0, render nothing — the empty state is
  // handled by the component displaying the data (DataTable/SimpleList).
  if (!isPartial && total === 0) {
    return null;
  }

  // Custom actions override the default pagination controls.
  if (actions) {
    return (
      <div
        className={cn(
          "mt-2 flex items-center justify-end gap-x-2 gap-4",
          className,
        )}
      >
        {actions}
      </div>
    );
  }

  const pageStart = (page - 1) * perPage + 1;
  const pageEnd =
    total == null ? page * perPage : Math.min(page * perPage, total);
  const count = total != null && total > 0 ? Math.ceil(total / perPage) : 1;

  const boundaryCount = 1;
  const siblingCount = 1;

  const range = (start: number, end: number) => {
    const length = end - start + 1;
    return Array.from({ length }, (_, i) => start + i);
  };

  const startPages = range(1, Math.min(boundaryCount, count));
  const endPages = range(
    Math.max(count - boundaryCount + 1, boundaryCount + 1),
    count,
  );

  const siblingsStart = Math.max(
    Math.min(page - siblingCount, count - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(page + siblingCount, boundaryCount + siblingCount * 2 + 2),
    count - boundaryCount - 1,
  );
  const siblingPages = range(siblingsStart, siblingsEnd);

  const goToPage = (newPage: number) => setPage(newPage);

  // chelone's i18n returns the KEY (never a `_` default) when a message is not
  // registered, so compose each label with a local English fallback: use the
  // translation only when it actually resolved to something other than the key.
  const t = (key: string, fallback: string, params?: TranslateParamValues) => {
    const out = translate(key, params ?? {});
    return out === key ? fallback : out;
  };

  const previousLabel = t("chelone.navigation.previous", "Previous");
  const nextLabel = t("chelone.navigation.next", "Next");
  const rowsPerPageLabel = t(
    "chelone.navigation.page_rows_per_page",
    "Rows per page",
  );
  const totalDisplay = total == null || total === -1 ? pageEnd : total;
  const rangeLabel = isPartial
    ? t(
        "chelone.navigation.partial_page_range_info",
        `${pageStart}-${pageEnd}`,
        {
          offsetBegin: pageStart,
          offsetEnd: pageEnd,
        },
      )
    : t(
        "chelone.navigation.page_range_info",
        `${pageStart}-${pageEnd} of ${totalDisplay}`,
        {
          offsetBegin: pageStart,
          offsetEnd: pageEnd,
          total: totalDisplay,
        },
      );

  const navButtonClass = (active = false, disabled = false) =>
    cn(
      buttonVariants({ variant: active ? "outline" : "ghost", size: "icon" }),
      disabled && "pointer-events-none opacity-50 cursor-not-allowed",
    );

  return (
    <div
      className={cn(
        "mt-2 flex items-center justify-end gap-x-2 gap-4",
        className,
      )}
    >
      <div className="hidden md:flex items-center gap-x-2">
        <p className="text-sm font-medium whitespace-nowrap">
          {rowsPerPageLabel}
        </p>
        <Select
          value={perPage.toString()}
          onValueChange={(value) => {
            setPerPage(Number(value));
          }}
        >
          <SelectTrigger className="h-8 w-fit">
            <SelectValue placeholder={perPage} />
          </SelectTrigger>
          <SelectContent side="top">
            {rowsPerPageOptions.map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="text-sm text-muted-foreground">{rangeLabel}</div>
      <Pagination className="-w-full -mx-auto">
        <PaginationContent>
          <PaginationItem>
            <button
              type="button"
              aria-label={previousLabel}
              aria-disabled={!hasPreviousPage || undefined}
              disabled={!hasPreviousPage}
              onClick={hasPreviousPage ? () => goToPage(page - 1) : undefined}
              className={navButtonClass(false, !hasPreviousPage)}
            >
              <ChevronLeftIcon />
            </button>
          </PaginationItem>
          {!isPartial && (
            <>
              {startPages.map((pageNumber) => (
                <PaginationItem key={pageNumber}>
                  <button
                    type="button"
                    onClick={() => goToPage(pageNumber)}
                    aria-current={pageNumber === page ? "page" : undefined}
                    className={navButtonClass(pageNumber === page)}
                  >
                    {pageNumber}
                  </button>
                </PaginationItem>
              ))}
              {siblingsStart > boundaryCount + 2 ? (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : boundaryCount + 1 < count - boundaryCount ? (
                <PaginationItem>
                  <button
                    type="button"
                    onClick={() => goToPage(boundaryCount + 1)}
                    aria-current={
                      boundaryCount + 1 === page ? "page" : undefined
                    }
                    className={navButtonClass(boundaryCount + 1 === page)}
                  >
                    {boundaryCount + 1}
                  </button>
                </PaginationItem>
              ) : null}
              {siblingPages.map((pageNumber) => (
                <PaginationItem key={pageNumber}>
                  <button
                    type="button"
                    onClick={() => goToPage(pageNumber)}
                    aria-current={pageNumber === page ? "page" : undefined}
                    className={navButtonClass(pageNumber === page)}
                  >
                    {pageNumber}
                  </button>
                </PaginationItem>
              ))}
              {siblingsEnd < count - boundaryCount - 1 ? (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : count - boundaryCount > boundaryCount ? (
                <PaginationItem>
                  <button
                    type="button"
                    onClick={() => goToPage(count - boundaryCount)}
                    aria-current={
                      count - boundaryCount === page ? "page" : undefined
                    }
                    className={navButtonClass(count - boundaryCount === page)}
                  >
                    {count - boundaryCount}
                  </button>
                </PaginationItem>
              ) : null}
              {endPages.map((pageNumber) => (
                <PaginationItem key={pageNumber}>
                  <button
                    type="button"
                    onClick={() => goToPage(pageNumber)}
                    aria-current={pageNumber === page ? "page" : undefined}
                    className={navButtonClass(pageNumber === page)}
                  >
                    {pageNumber}
                  </button>
                </PaginationItem>
              ))}
            </>
          )}
          <PaginationItem>
            <button
              type="button"
              aria-label={nextLabel}
              aria-disabled={!hasNextPage || undefined}
              disabled={!hasNextPage}
              onClick={hasNextPage ? () => goToPage(page + 1) : undefined}
              className={navButtonClass(false, !hasNextPage)}
            >
              <ChevronRightIcon />
            </button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

export { ListPagination, type ListPaginationProps };
