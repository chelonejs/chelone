import type { ComponentType } from "react";
import { Navigate, useParams } from "react-router";
import { CategoryIndex } from "./category-index";
import { InstallCommand } from "./mdx/install-command";
import { introSlugToSection, navTree } from "./nav-content";
import { findGroup } from "./nav-sequence";
import { PrevNext } from "./prev-next";
import { installFor, vueInstallFor } from "./registry";

interface GuideModule {
  default: ComponentType;
  frontmatter?: { title?: string; description?: string; registry?: string };
}
const guides = import.meta.glob<GuideModule>("./content/**/*.mdx", {
  eager: true,
});

const bySlug = new Map(
  Object.entries(guides).map(([k, m]) => [
    k
      .replace(/^\.\/content\//, "")
      .replace(/\.mdx$/, "")
      .replace(/\/index$/, ""),
    m,
  ]),
);

export default function MdxPage() {
  const slug = (useParams()["*"] ?? "").replace(/\/+$/, "");

  // A bare section slug (e.g. /docs/viewing) renders that category's index.
  const section = navTree.find((g) => g.dir === slug);
  if (section) return <CategoryIndex section={section} />;

  // A bare split-page group URL (e.g. /docs/page-components/edit) redirects to its index.
  const group = findGroup(navTree, slug);
  if (group?.indexSlug)
    return <Navigate to={`/docs/${group.indexSlug}`} replace />;

  // An intro page (frontmatter `index: true`) lives in its section's landing,
  // so its own URL redirects there to avoid duplicate content.
  const introSection = introSlugToSection[slug];
  if (introSection) return <Navigate to={`/docs/${introSection}`} replace />;

  const mod = bySlug.get(slug);
  if (!mod) {
    return (
      <div className="py-12">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-muted-foreground">
          No doc for <code>/docs/{slug}</code>.
        </p>
      </div>
    );
  }
  const title = mod.frontmatter?.title;
  const description = mod.frontmatter?.description;
  const install = installFor(mod.frontmatter?.registry);
  const vue = vueInstallFor(mod.frontmatter?.registry);
  const Content = mod.default;
  return (
    <article className="prose prose-neutral dark:prose-invert">
      {title && (
        <h1 className="mb-2 text-3xl font-bold tracking-tight">{title}</h1>
      )}
      {description && (
        <p className="mb-6 text-lg text-muted-foreground">{description}</p>
      )}
      {install && (
        <div className="not-prose mb-8">
          <p className="mb-2 text-sm font-semibold">Installation</p>
          <InstallCommand install={install} vue={vue} />
        </div>
      )}
      <Content />
      <PrevNext slug={slug} />
    </article>
  );
}
