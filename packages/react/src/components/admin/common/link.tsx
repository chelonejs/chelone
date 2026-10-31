import type { Ref } from "react";
import { cn } from "@/lib/utils";
import {
  type AdapterLinkProps,
  useRouterAdapter,
} from "../../../router/adapter";

type LinkProps = AdapterLinkProps & { ref?: Ref<HTMLAnchorElement> };

/**
 * An admin navigation link: the router adapter's `Link` with the shared link
 * styling. Works under any router adapter.
 *
 * @example
 * import { Link } from "@chelone/react";
 *
 * const BackToPosts = () => <Link to="/posts">Posts</Link>;
 */
function Link({ className, ...props }: LinkProps) {
  const { Link: AdapterLink } = useRouterAdapter();
  return (
    <AdapterLink
      className={cn(
        "text-primary underline-offset-4 hover:underline",
        className,
      )}
      {...props}
    />
  );
}

export { Link, type LinkProps };
