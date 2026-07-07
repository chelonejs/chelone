import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { CardDescriptions } from "./mdx/card-context";
import { introBySection } from "./nav-content";
import { fallbackIcon, SECTION_META } from "./section-meta";
import type { DocGroup } from "./types";

// Page descriptions for the cards (from frontmatter).
const frontmatter = import.meta.glob<{
  frontmatter?: { description?: string };
}>("./content/**/*.mdx", { eager: true });
const descBySlug = new Map<string, string>();
for (const [key, mod] of Object.entries(frontmatter)) {
  const slug = key
    .replace(/^\.\/content\//, "")
    .replace(/\.mdx$/, "")
    .replace(/\/index$/, "");
  descBySlug.set(slug, mod.frontmatter?.description ?? "");
}

const ease = "cubic-bezier(0.32,0.72,0,1)";

// Landing page for a section — reached from the /docs cards / breadcrumb.
export function CategoryIndex({ section }: { section: DocGroup }) {
  const meta = SECTION_META[section.dir];
  const Icon = meta?.icon ?? fallbackIcon;
  // Sections with a curated intro page (frontmatter `index: true`) render that
  // content as their landing; the rest fall back to an auto card grid.
  const Intro = introBySection[section.dir];
  const cards = section.children.flatMap((c) =>
    c.kind === "leaf"
      ? [{ to: `/docs/${c.slug}`, title: c.title, slug: c.slug }]
      : c.indexSlug
        ? [{ to: `/docs/${c.indexSlug}`, title: c.title, slug: c.indexSlug }]
        : [],
  );

  return (
    <div className="not-prose">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-sm shadow-indigo-500/20">
          <Icon className="size-5" strokeWidth={1.5} />
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {section.title}
        </h1>
      </div>
      {meta?.blurb && (
        <p className="mt-3 max-w-lg text-muted-foreground">{meta.blurb}</p>
      )}

      {Intro ? (
        <CardDescriptions.Provider value={descBySlug}>
          <article className="prose prose-neutral mt-10 max-w-none dark:prose-invert">
            <Intro />
          </article>
        </CardDescriptions.Provider>
      ) : (
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {cards.map((card, i) => {
            const desc = descBySlug.get(card.slug);
            return (
              <Link
                key={card.slug}
                to={card.to}
                className="group block rounded-xl border border-border/60 bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:bg-muted/40"
                style={{
                  transitionTimingFunction: ease,
                  animation: `docs-rise 0.5s ${ease} both`,
                  animationDelay: `${Math.min(i, 12) * 30}ms`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {card.title}
                  </span>
                  <ArrowUpRight
                    className="ml-auto size-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                    strokeWidth={1.5}
                    style={{ transitionTimingFunction: ease }}
                  />
                </div>
                {desc && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                    {desc}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
