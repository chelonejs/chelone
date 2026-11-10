"use client";

import { type AnchorHTMLAttributes, useContext } from "react";
import { RouterAdapterContext } from "../../router/adapter";

interface ServerListLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  /** Where the link goes. With none it is disabled: no `href`, and `aria-disabled`. */
  href?: string;
}

/**
 * A sort or page link of a `<ServerList>`: the router adapter's `Link` under a
 * `RouterAdapterProvider`, so a click is a client navigation, and a plain
 * `<a href>` with none. Either way the server markup holds the `href`, so the
 * link works before hydration.
 *
 * @example
 * <ServerListLink href="/posts?page=2">Next</ServerListLink>
 */
function ServerListLink({ href, children, ...rest }: ServerListLinkProps) {
  const adapter = useContext(RouterAdapterContext);
  if (href === undefined) {
    return (
      <a aria-disabled="true" {...rest}>
        {children}
      </a>
    );
  }
  if (adapter) {
    return (
      <adapter.Link to={href} {...rest}>
        {children}
      </adapter.Link>
    );
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

export { ServerListLink, type ServerListLinkProps };
