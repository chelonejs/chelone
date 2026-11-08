import {
  type FilterPayload,
  type SortPayload,
  serializeListParams,
} from "@chelone/core";
import { CircleXIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useGetList } from "../../../hooks";
import { useTranslate } from "../../../i18n-hooks";
import { cn } from "../../../lib/utils";
import { useResourceContext } from "../../../resource";
import { useCreatePath } from "../../../router";
import { useRouterAdapter } from "../../../router/adapter";

interface CountProps {
  /** The resource to count. Defaults to the ambient resource. */
  resource?: string;
  filter?: FilterPayload;
  sort?: SortPayload;
  /** Link the count to the resource's list, filtered by `filter`. */
  link?: boolean;
  /** Milliseconds a pending count waits before showing a spinner. Default 1000. */
  timeout?: number;
  className?: string;
}

/**
 * How many records of a resource match `filter`, read from the `total` of a
 * one-row `getList` page. Renders nothing when the provider returns no
 * `total`; a `0` total renders as `0`.
 *
 * `ReferenceManyCount` counts a reverse relation; this counts a resource.
 *
 * @example
 * <Count resource="posts" filter={{ status: "draft" }} link />
 */
function Count(props: CountProps) {
  const { filter, sort, link, timeout = 1000, className } = props;
  const resource = useResourceContext(props);
  if (!resource) {
    throw new Error(
      "<Count> components should be used inside a <Resource> component or provided the resource prop.",
    );
  }

  const translate = useTranslate();
  const createPath = useCreatePath();
  const { Link } = useRouterAdapter();
  const { data, isPending, error } = useGetList(resource, {
    filter,
    sort,
    pagination: { page: 1, perPage: 1 },
  });

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!isPending) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), timeout);
    return () => clearTimeout(timer);
  }, [isPending, timeout]);

  if (isPending) {
    return timedOut ? <Spinner className={className} /> : null;
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

  if (data?.total == null) {
    return null;
  }

  if (link) {
    return (
      <Link
        to={`${createPath({ type: "list", resource })}${serializeListParams({ filter })}`}
        className={cn("underline-offset-4 hover:underline", className)}
        onClick={(event) => event.stopPropagation()}
      >
        {data.total}
      </Link>
    );
  }

  return <span className={className}>{data.total}</span>;
}

export { Count, type CountProps };
