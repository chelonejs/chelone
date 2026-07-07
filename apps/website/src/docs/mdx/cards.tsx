import { ArrowUpRight } from "lucide-react";
import { type ReactNode, useContext } from "react";
import { Link } from "react-router";
import { CardDescriptions } from "./card-context";

const ease = "cubic-bezier(0.32,0.72,0,1)";
const cardClass =
  "group block rounded-xl border border-border/60 bg-card p-4 no-underline transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:bg-muted/40";

/** Grid wrapper for a set of <Card>s — the same card style as the docs index. */
export function Cards({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose my-6 grid gap-3 sm:grid-cols-2">{children}</div>
  );
}

interface CardProps {
  title: string;
  href: string;
  children?: ReactNode;
}

/** A single linked card. External hrefs open in a new tab; internal use Link.
 *  With no body, an internal card auto-fills the target's frontmatter description. */
export function Card({ title, href, children }: CardProps) {
  const external = /^https?:\/\//.test(href);
  const descriptions = useContext(CardDescriptions);
  const desc =
    children ??
    (external ? undefined : descriptions.get(href.replace(/^\/docs\//, "")));
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">{title}</span>
        <ArrowUpRight
          className="ml-auto size-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
          strokeWidth={1.5}
          style={{ transitionTimingFunction: ease }}
        />
      </div>
      {desc && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {desc}
        </p>
      )}
    </>
  );
  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cardClass}
    >
      {body}
    </a>
  ) : (
    <Link to={href} className={cardClass}>
      {body}
    </Link>
  );
}
