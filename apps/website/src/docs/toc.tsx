import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { cn } from "@/lib/utils";

interface Heading {
  id: string;
  text: string;
  level: number;
}

// "On this page" rail — extracts h2/h3 (with ids from rehype-slug) from the
// rendered article and scroll-spies the current section.
export function Toc() {
  const { pathname } = useLocation();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("article h2[id], article h3[id]"),
    );
    setHeadings(
      els.map((el) => ({
        id: el.id,
        text: el.textContent ?? "",
        level: el.tagName === "H2" ? 2 : 3,
      })),
    );
  }, [pathname]);

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <aside className="hidden w-56 shrink-0 xl:block">
      <div className="sticky top-24">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          On this page
        </p>
        <ul className="border-l border-border">
          {headings.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                className={cn(
                  "-ml-px block border-l-2 py-1 text-sm transition-colors",
                  h.level === 3 ? "pl-6" : "pl-3",
                  activeId === h.id
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
