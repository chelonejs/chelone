import { useTimeout } from "../../../compat-hooks";
import { cn } from "../../../lib/utils";
import { Skeleton } from "../../ui/skeleton";

export interface SimpleListLoadingProps {
  className?: string;
  /** Number of placeholder rows. Default 5. */
  nbFakeLines?: number;
  hasLeftAvatarOrIcon?: boolean;
  hasRightAvatarOrIcon?: boolean;
  hasSecondaryText?: boolean;
  hasTertiaryText?: boolean;
}

/**
 * Placeholder rows for a pending `<SimpleList>`. Renders nothing for the first
 * second so a fast response never flashes a skeleton.
 */
function SimpleListLoading({
  className,
  nbFakeLines = 5,
  hasLeftAvatarOrIcon,
  hasRightAvatarOrIcon,
  hasSecondaryText,
  hasTertiaryText,
}: SimpleListLoadingProps) {
  const ready = useTimeout(1000);
  if (!ready) return null;

  return (
    <ul className={cn("flex flex-col", className)}>
      {Array.from({ length: nbFakeLines }, (_, index) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholders
          key={index}
          className="flex items-center gap-3 px-4 py-3"
        >
          {hasLeftAvatarOrIcon ? (
            <Skeleton className="size-10 shrink-0 rounded-full" />
          ) : null}
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            {hasSecondaryText ? <Skeleton className="h-3 w-1/2" /> : null}
            {hasTertiaryText ? <Skeleton className="h-3 w-1/3" /> : null}
          </div>
          {hasRightAvatarOrIcon ? (
            <Skeleton className="size-6 shrink-0 rounded-full" />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export { SimpleListLoading };
