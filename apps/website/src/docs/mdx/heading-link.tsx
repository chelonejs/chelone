import { type ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

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
  const { search } = useLocation();
  // Counts copies (0 = none showing), so a second copy restarts the timer and
  // remounts the label for assistive tech to announce again.
  const [copies, setCopies] = useState(0);

  useEffect(() => {
    if (copies === 0) return;
    const timer = setTimeout(() => setCopies(0), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copies]);

  if (!id) return <Tag>{children}</Tag>;

  async function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    // Leave modified clicks to the browser: open in a new tab, save link.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    const { origin, pathname } = window.location;
    navigate({ search, hash: id });
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
      setCopies((n) => n + 1);
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
        {copies > 0 && <span key={copies}>Copied</span>}
      </span>
    </Tag>
  );
}
