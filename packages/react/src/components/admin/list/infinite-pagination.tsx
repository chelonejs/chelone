import { useEffect, useRef } from "react";
import { useTranslate } from "../../../i18n-hooks";
import { cn } from "../../../lib/utils";
import { useInfiniteListContext } from "../../../list/infinite-list-context";
import { Button } from "../../ui/button";

/**
 * Pagination for an `<InfiniteList>`: a Load more button, plus (with
 * `autoLoad`) a sentinel that loads the next page as it scrolls into view.
 * The button stays visible next to the sentinel as the fallback for a scroll
 * that cannot trigger a load. Without `IntersectionObserver` only the button
 * shows. Once every page is loaded it shows an end message; it renders nothing
 * while the first page loads.
 */
interface InfinitePaginationProps {
  /** Pixels before the end of the list at which `autoLoad` fires. */
  offset?: number;
  /** Load the next page when the end of the list scrolls into view. */
  autoLoad?: boolean;
  /** Classes for the root element. */
  className?: string;
}

function InfinitePagination({
  offset = 250,
  autoLoad = true,
  className,
}: InfinitePaginationProps) {
  const translate = useTranslate();
  const {
    data,
    error,
    isPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteListContext();
  const sentinelRef = useRef<HTMLDivElement>(null);
  // The latest `fetchNextPage`, so the observer need not be rebuilt when the
  // list result (and with it the callback's identity) changes. Written in an
  // effect, not during render, so a discarded render cannot leave it stale.
  const fetchRef = useRef(fetchNextPage);
  useEffect(() => {
    fetchRef.current = fetchNextPage;
  }, [fetchNextPage]);

  const canObserve = typeof IntersectionObserver !== "undefined";
  const canLoad = !!hasNextPage && !isFetchingNextPage;
  // After a failed load the sentinel is still in view: a fresh observer would
  // report it at once and retry forever. Load more stays as the manual retry.
  const observing = autoLoad && canObserve && canLoad && !error;

  // Rebuilt after each page lands: an observer only reports a change, so one
  // kept across loads would never fire again while the sentinel stays in view.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!observing || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void fetchRef.current();
        }
      },
      // A non-finite offset would make the margin string invalid and throw.
      { rootMargin: `0px 0px ${Number.isFinite(offset) ? offset : 0}px 0px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [observing, offset]);

  if (isPending) return null;
  const hasRows = (data?.length ?? 0) > 0;

  // chelone's i18n returns the KEY when a message is not registered, so use
  // the translation only when it resolved to something else.
  const t = (key: string, fallback: string) => {
    const out = translate(key, {});
    return out === key ? fallback : out;
  };

  if (!hasNextPage) {
    if (!hasRows) return null;
    return (
      <div
        className={cn(
          "py-2 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {t("chelone.navigation.no_more_rows", "No more rows")}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-2 py-2", className)}>
      {autoLoad && canObserve ? (
        <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={isFetchingNextPage}
        onClick={() => void fetchNextPage()}
      >
        {t("chelone.navigation.load_more", "Load more")}
      </Button>
    </div>
  );
}

export { InfinitePagination, type InfinitePaginationProps };
