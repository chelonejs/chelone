import { Fragment } from "react";
import { Link } from "react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { navTree } from "./nav-content";
import { findGroup, leafTitle } from "./nav-sequence";

interface DocsBreadcrumbProps {
  /** Active doc slug, e.g. "page-components/list/overview" ("" on the index). */
  slug: string;
}

/**
 * Full-path docs breadcrumb shown in the SiteShell inset header:
 * `Docs › <section> › [<group>] › <page>`. Always starts at the docs home; each
 * ancestor links to its index. Shares the path logic the in-content breadcrumb
 * used before it moved into the header.
 */
export function DocsBreadcrumb({ slug }: DocsBreadcrumbProps) {
  const parts = slug ? slug.split("/") : [];
  // Ancestors (everything but the last segment) → linked crumbs.
  const crumbs = parts
    .slice(0, -1)
    .map((_, i) => {
      const dir = parts.slice(0, i + 1).join("/");
      if (i === 0) {
        const sec = navTree.find((g) => g.dir === dir);
        return sec ? { to: `/docs/${dir}`, label: sec.title } : null;
      }
      const g = findGroup(navTree, dir);
      return g?.indexSlug
        ? { to: `/docs/${g.indexSlug}`, label: g.title }
        : null;
    })
    .filter(Boolean) as { to: string; label: string }[];

  // The final segment's label: a leaf page, or a section/group landing.
  const leaf = slug
    ? (leafTitle(slug, navTree) ??
      navTree.find((g) => g.dir === slug)?.title ??
      findGroup(navTree, slug)?.title ??
      null)
    : null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {slug ? (
            <BreadcrumbLink asChild>
              <Link to="/docs">Docs</Link>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage>Docs</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {crumbs.map((crumb) => (
          <Fragment key={crumb.to}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={crumb.to}>{crumb.label}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Fragment>
        ))}
        {leaf && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{leaf}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
