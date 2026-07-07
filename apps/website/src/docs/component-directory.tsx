import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { navTree } from "./nav-content";
import { fallbackIcon, SECTION_META } from "./section-meta";
import type { DocNode } from "./types";

const ease = "cubic-bezier(0.32,0.72,0,1)";

// Guide sections aren't components — keep the directory to the library itself.
const GUIDE_SECTIONS = new Set(["getting-started", "app-config"]);

/**
 * The routable slug for a component node. A leaf is its own page; a split-page
 * group (e.g. List → overview/…) uses its `dir`, which both surfaces resolve:
 * docs redirects `…/list` → `…/list/overview`, and the gallery keys examples by
 * dir. So a single slug + a dynamic `basePath` drives both /docs and
 * /demo/components links.
 */
function nodeSlug(node: DocNode): string {
  return node.kind === "leaf" ? node.slug : node.dir;
}

interface ComponentDirectoryProps {
  /** Link prefix: "/docs" (doc pages) or "/demo/components" (live gallery). */
  basePath: string;
}

/**
 * Component-library directory: every component grouped under its category, each
 * linking to `${basePath}/${slug}`. Shared by the /docs/components splash and
 * the /demo/components gallery landing — same data, dynamic prefix.
 *
 * Renders content only (no outer padding/width); the caller frames it for its
 * surface (the docs column constrains width, the gallery wraps it).
 */
export function ComponentDirectory({ basePath }: ComponentDirectoryProps) {
  const categories = navTree.filter(
    (g) => !GUIDE_SECTIONS.has(g.dir) && g.children.length > 0,
  );

  return (
    <div className="not-prose">
      {/* Hero */}
      <span className="inline-block rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gradient">
        Components
      </span>
      <h1 className="mt-5 max-w-xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        The component library
      </h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground">
        Every Chelone component, grouped by what it does. Click any one for its
        docs, props, and live examples.
      </p>

      {/* Category sections */}
      <div className="mt-14 space-y-12">
        {categories.map((cat, ci) => {
          const meta = SECTION_META[cat.dir] ?? {
            icon: fallbackIcon,
            blurb: "",
          };
          const Icon = meta.icon;
          return (
            <section
              key={cat.dir}
              aria-labelledby={cat.dir}
              style={{
                animation: `docs-rise 0.55s ${ease} both`,
                animationDelay: `${ci * 45}ms`,
              }}
            >
              <h2
                id={cat.dir}
                className="flex scroll-mt-20 items-center gap-2.5 text-lg font-semibold tracking-tight text-foreground"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-sm shadow-indigo-500/20">
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                {cat.title}
                <span className="text-xs font-normal tabular-nums text-muted-foreground">
                  {cat.children.length}
                </span>
              </h2>
              {meta.blurb && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {meta.blurb}
                </p>
              )}

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {cat.children.map((child) => {
                  const slug = nodeSlug(child);
                  return (
                    <Link
                      key={slug}
                      to={`${basePath}/${slug}`}
                      className="group flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-card px-3.5 py-2.5 text-sm transition-all duration-300 hover:-translate-y-px hover:border-border hover:bg-muted"
                      style={{ transitionTimingFunction: ease }}
                    >
                      <span className="truncate font-medium text-foreground">
                        {child.title}
                      </span>
                      <ArrowUpRight
                        className="size-3.5 shrink-0 text-muted-foreground/50 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                        strokeWidth={1.75}
                        style={{ transitionTimingFunction: ease }}
                      />
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
