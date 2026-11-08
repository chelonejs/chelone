import { ChevronLeftIcon, ChevronRightIcon, CircleXIcon } from "lucide-react";
import type { Ref } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslate } from "../../../i18n-hooks";
import { cn } from "../../../lib/utils";
import {
  type UsePrevNextControllerOptions,
  usePrevNextController,
} from "../../../prev-next-hooks";
import { useRouterAdapter } from "../../../router/adapter";

interface PrevNextButtonsProps extends UsePrevNextControllerOptions {
  className?: string;
  ref?: Ref<HTMLElement>;
}

/**
 * Previous and next buttons that step through the records of the list the
 * ambient record came from, in that list's sort and filter, with the position
 * ("2 / 40") between them. For an Edit or Show page.
 *
 * Renders a skeleton while the list loads, a labelled error icon when it
 * fails, and an empty placeholder when the record has no neighbour (for
 * instance when the list's filter excludes it).
 *
 * @example
 * <Edit actions={<PrevNextButtons />}>...</Edit>
 */
function PrevNextButtons(props: PrevNextButtonsProps) {
  const { className, ref, ...options } = props;
  const translate = useTranslate();
  const { Link } = useRouterAdapter();
  const {
    hasPrev,
    hasNext,
    prevPath,
    nextPath,
    index,
    total,
    error,
    isPending,
  } = usePrevNextController(options);

  if (isPending) {
    return (
      <Skeleton
        ref={ref as Ref<HTMLDivElement>}
        className={cn("h-9 w-24", className)}
      />
    );
  }

  if (error) {
    return (
      <CircleXIcon
        role="img"
        aria-label={translate("chelone.notification.http_error_label", {
          _: "Error",
        })}
        className={cn("size-4 text-destructive", className)}
      />
    );
  }

  if (!hasPrev && !hasNext) {
    return (
      <div
        ref={ref as Ref<HTMLDivElement>}
        data-slot="prev-next-placeholder"
        aria-hidden="true"
        className={cn("h-9 w-24", className)}
      />
    );
  }

  const previous = translate("chelone.navigation.previous", { _: "Previous" });
  const next = translate("chelone.navigation.next", { _: "Next" });
  const ghostIcon = buttonVariants({ variant: "ghost", size: "icon" });

  return (
    <nav ref={ref} className={cn("flex items-center gap-1", className)}>
      {prevPath ? (
        <Link to={prevPath} aria-label={previous} className={ghostIcon}>
          <ChevronLeftIcon />
        </Link>
      ) : (
        <Button variant="ghost" size="icon" aria-label={previous} disabled>
          <ChevronLeftIcon />
        </Button>
      )}
      {typeof index === "number" ? (
        <span className="text-sm text-muted-foreground tabular-nums">
          {total != null ? `${index + 1} / ${total}` : index + 1}
        </span>
      ) : null}
      {nextPath ? (
        <Link to={nextPath} aria-label={next} className={ghostIcon}>
          <ChevronRightIcon />
        </Link>
      ) : (
        <Button variant="ghost" size="icon" aria-label={next} disabled>
          <ChevronRightIcon />
        </Button>
      )}
    </nav>
  );
}

export { PrevNextButtons, type PrevNextButtonsProps };
