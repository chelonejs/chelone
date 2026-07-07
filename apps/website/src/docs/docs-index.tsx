import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { navTree } from "./nav-content";
import { fallbackIcon, SECTION_META } from "./section-meta";
import type { DocLeaf } from "./types";

const ease = "cubic-bezier(0.32,0.72,0,1)";

export default function DocsIndex() {
  const sections = navTree
    .map((g) => {
      const leaves = g.children.filter((c): c is DocLeaf => c.kind === "leaf");
      return { dir: g.dir, title: g.title, count: leaves.length };
    })
    .filter((s) => s.count > 0);

  const componentsHref =
    sections.find((s) => s.dir === "page-components")?.dir ?? sections[0]?.dir;

  return (
    <div className="not-prose">
      {/* Hero */}
      <span className="inline-block rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gradient">
        Documentation
      </span>
      <h1 className="mt-5 max-w-xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Build admin UIs, fast.
      </h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground">
        shadcn-native components for lists, forms, auth, and more. Copy them in,
        own the code, ship the dashboard.
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link
          to="/docs/getting-started/install"
          className="group inline-flex items-center gap-2.5 rounded-full bg-brand-gradient py-2.5 pl-5 pr-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-500/20 transition-transform duration-300 active:scale-[0.98]"
          style={{ transitionTimingFunction: ease }}
        >
          Get started
          <span
            className="flex size-6 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:translate-x-0.5"
            style={{ transitionTimingFunction: ease }}
          >
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </span>
        </Link>
        {componentsHref && (
          <Link
            to={`/docs/${componentsHref}`}
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Browse components
          </Link>
        )}
      </div>

      {/* Section cards (double-bezel) */}
      <div className="mt-14 grid gap-4 sm:grid-cols-2">
        {sections.map((s, i) => {
          const meta = SECTION_META[s.dir] ?? { icon: fallbackIcon, blurb: "" };
          const Icon = meta.icon;
          return (
            <Link
              key={s.dir}
              to={`/docs/${s.dir}`}
              className="group block rounded-2xl bg-muted/40 p-1.5 ring-1 ring-border/60 transition-all duration-500 hover:-translate-y-0.5 hover:bg-muted hover:ring-border"
              style={{
                transitionTimingFunction: ease,
                animation: `docs-rise 0.55s ${ease} both`,
                animationDelay: `${i * 35}ms`,
              }}
            >
              <div className="h-full rounded-[0.85rem] border border-border/40 bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-sm shadow-indigo-500/20">
                    <Icon className="size-[1.15rem]" strokeWidth={1.5} />
                  </span>
                  <span className="font-semibold leading-tight text-foreground">
                    {s.title}
                  </span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {s.count}
                  </span>
                  <ArrowUpRight
                    className="size-4 text-muted-foreground transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                    strokeWidth={1.5}
                    style={{ transitionTimingFunction: ease }}
                  />
                </div>
                {meta.blurb && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {meta.blurb}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
