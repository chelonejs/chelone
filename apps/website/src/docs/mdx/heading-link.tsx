import { type ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router";

const COPIED_MS = 2000;

interface HeadingLinkProps {
  level: 2 | 3;
  id?: string;
  children?: ReactNode;
}

// An h2/h3 from the MDX body. With an id (from rehype-slug) the heading links
// to itself: a click copies the page URL plus `#id`, moves the hash, and
// scrolls the heading in. Without one it is plain text.
export function HeadingLink({ level, id, children }: HeadingLinkProps) {
  const Tag = level === 2 ? "h2" : "h3";
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!id) return <Tag>{children}</Tag>;

  async function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    // Leave modified clicks to the browser: open in a new tab, save link.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    const { origin, pathname, search } = window.location;
    navigate({ hash: id });
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    event.currentTarget.parentElement?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
    });
    try {
      await navigator.clipboard.writeText(
        `${origin}${pathname}${search}#${id}`,
      );
      setCopied(true);
    } catch {
      // No clipboard permission: the anchor still works, so stay quiet.
    }
  }

  return (
    <Tag id={id}>
      <a href={`#${id}`} onClick={handleClick} className="no-underline">
        {children}
      </a>
      {/* Always mounted: a live region announces text added to it, not itself. */}
      <span
        role="status"
        className="ml-3 align-middle text-xs font-normal text-muted-foreground"
      >
        {copied ? "Copied" : ""}
      </span>
    </Tag>
  );
}
