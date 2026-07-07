import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { DocSearch } from "@/components/doc-search";
import { NavTree } from "@/components/site-shell/nav-tree";
import { SiteShell } from "@/components/site-shell/site-shell";
import { SiteSidebar } from "@/components/site-shell/site-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { DocsBreadcrumb } from "./docs-breadcrumb";
import { navTree } from "./nav-content";
import { SECTION_META } from "./section-meta";
import { Toc } from "./toc";

const ancestorDirs = (slug: string): string[] => {
  const parts = slug.split("/");
  const dirs: string[] = [];
  for (let i = 1; i < parts.length; i++) dirs.push(parts.slice(0, i).join("/"));
  return dirs; // e.g. "a/b/c" -> ["a","a/b"]
};

export default function DocsLayout() {
  const { pathname } = useLocation();
  const activeSlug = pathname.replace(/^\/docs\/?/, "").replace(/\/+$/, "");

  const activeSection =
    navTree.find((s) =>
      s.children.some((c) => c.kind === "leaf" && c.slug === activeSlug),
    )?.dir ?? navTree.find((s) => s.dir === activeSlug)?.dir;

  // Controlled open state so the active section auto-opens on client-side nav.
  const [openDirs, setOpenDirs] = useState<Set<string>>(
    () =>
      new Set(
        [...ancestorDirs(activeSlug), "getting-started"].filter(
          Boolean,
        ) as string[],
      ),
  );

  useEffect(() => {
    if (activeSection) {
      setOpenDirs((prev) =>
        prev.has(activeSection) ? prev : new Set(prev).add(activeSection),
      );
    }
    for (const dir of ancestorDirs(activeSlug)) {
      setOpenDirs((prev) => (prev.has(dir) ? prev : new Set(prev).add(dir)));
    }
  }, [activeSection, activeSlug]);

  const onToggle = (dir: string, isOpen: boolean) =>
    setOpenDirs((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(dir);
      else next.delete(dir);
      return next;
    });

  return (
    <SiteShell
      sidebar={
        <SiteSidebar>
          <NavTree
            tree={navTree}
            hrefFor={(s) => `/docs/${s}`}
            iconFor={(dir) => SECTION_META[dir]?.icon}
            activeSlug={activeSlug}
            openDirs={openDirs}
            onToggle={onToggle}
          />
        </SiteSidebar>
      }
      breadcrumb={<DocsBreadcrumb slug={activeSlug} />}
      actions={
        <>
          <DocSearch />
          <ThemeToggle />
        </>
      }
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex justify-center gap-12">
          <div className="w-full min-w-0 max-w-3xl">
            <Outlet />
          </div>
          <Toc />
        </div>
      </div>
    </SiteShell>
  );
}
