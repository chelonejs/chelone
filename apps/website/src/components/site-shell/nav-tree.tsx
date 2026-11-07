import { ChevronRight } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { NavLink } from "react-router";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { groupByCategory } from "@/docs/nav";
import type { DocGroup, DocNode } from "@/docs/types";

type IconType = ComponentType<{ className?: string }>;

export interface NavTreeProps {
  tree: DocGroup[];
  hrefFor: (slug: string) => string;
  /** Per top-level-section icon, keyed by section `dir` (shown when collapsed). */
  iconFor?: (dir: string) => IconType | undefined;
  activeSlug?: string;
  openDirs: Set<string>;
  onToggle: (dir: string, open: boolean) => void;
  onNavigate?: () => void;
  /** Optional badge/indicator per leaf slug — return `null` for nothing. */
  badgeFor?: (slug: string) => ReactNode;
  /**
   * When true, clicking a top-level section toggles its collapsible instead of
   * navigating to a section index. Docs leaves it off so sections link to
   * their landing.
   */
  sectionAsToggle?: boolean;
  /**
   * Class for the rendered `<SidebarGroup>`. Docs uses NavTree as the sole
   * group (default `p-2` padding).
   */
  className?: string;
}

/**
 * True when `activeSlug` is the group's index slug or any descendant leaf's
 * slug, so a group stays highlighted on every page inside it.
 */
function groupIsActive(group: DocGroup, activeSlug: string): boolean {
  if ((group.indexSlug ?? group.dir) === activeSlug) return true;
  return group.children.some((child) =>
    child.kind === "leaf"
      ? child.slug === activeSlug
      : groupIsActive(child, activeSlug),
  );
}

interface SubProps {
  activeSlug: string;
  hrefFor: (slug: string) => string;
  openDirs: Set<string>;
  onToggle: (dir: string, open: boolean) => void;
  onNavigate?: () => void;
  badgeFor?: (slug: string) => ReactNode;
}

/**
 * Renders one child node inside a `<SidebarMenuSub>`. Recursive: a leaf is a
 * link; a split-page group is a collapsible sub-item whose label navigates to
 * its Overview and whose chevron toggles its own deeper sub-list.
 */
function NavSubNode({ node, ...p }: { node: DocNode } & SubProps) {
  if (node.kind === "leaf") {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton asChild isActive={node.slug === p.activeSlug}>
          <NavLink to={p.hrefFor(node.slug)} onClick={p.onNavigate}>
            {node.title}
            {p.badgeFor?.(node.slug)}
          </NavLink>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }
  const to = node.indexSlug ?? node.dir;
  return (
    <Collapsible
      asChild
      open={p.openDirs.has(node.dir)}
      onOpenChange={(o) => p.onToggle(node.dir, o)}
      className="group/subnode"
    >
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          asChild
          isActive={groupIsActive(node, p.activeSlug)}
        >
          <NavLink to={p.hrefFor(to)} onClick={p.onNavigate}>
            {node.title}
          </NavLink>
        </SidebarMenuSubButton>
        <CollapsibleTrigger asChild>
          <SidebarMenuAction className="transition-transform group-data-[state=open]/subnode:rotate-90">
            <ChevronRight />
            <span className="sr-only">Toggle {node.title}</span>
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {node.children.map((child) => (
              <NavSubNode
                key={child.kind === "leaf" ? child.slug : child.dir}
                node={child}
                {...p}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuSubItem>
    </Collapsible>
  );
}

const nodeKey = (n: DocNode) => (n.kind === "leaf" ? n.slug : n.dir);

/**
 * Shared collapsible nav tree renderer in the sidebar-07 NavMain shape: each
 * top-level section is an icon menu-button (so it shows as an icon when the
 * sidebar collapses to `collapsible="icon"`), expanding to its pages.
 *
 * Presentation-only: caller owns open state + href shape + section icons.
 *   - docs:    hrefFor={s => `/docs/${s}`},    iconFor={d => SECTION_META[d]?.icon}
 */
export function NavTree({
  tree,
  hrefFor,
  iconFor,
  activeSlug = "",
  openDirs,
  onToggle,
  onNavigate,
  badgeFor,
  sectionAsToggle,
  className,
}: NavTreeProps) {
  return (
    <SidebarGroup className={className}>
      <SidebarGroupContent>
        <SidebarMenu>
          {tree.map((section) => {
            const Icon = iconFor?.(section.dir);
            const to = section.indexSlug ?? section.dir;
            return (
              <Collapsible
                key={section.dir}
                asChild
                open={openDirs.has(section.dir)}
                onOpenChange={(o) => onToggle(section.dir, o)}
                className="group/section"
              >
                <SidebarMenuItem>
                  {sectionAsToggle ? (
                    // The whole section row toggles its sub-list.
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={section.title}>
                        {Icon ? <Icon /> : null}
                        <span>{section.title}</span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/section:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  ) : (
                    // Docs: the section links to its landing; a separate chevron
                    // toggles the sub-list.
                    <>
                      <SidebarMenuButton
                        asChild
                        tooltip={section.title}
                        isActive={groupIsActive(section, activeSlug)}
                      >
                        <NavLink to={hrefFor(to)} onClick={onNavigate}>
                          {Icon ? <Icon /> : null}
                          <span>{section.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuAction className="transition-transform group-data-[state=open]/section:rotate-90">
                          <ChevronRight />
                          <span className="sr-only">
                            Toggle {section.title}
                          </span>
                        </SidebarMenuAction>
                      </CollapsibleTrigger>
                    </>
                  )}
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {groupByCategory(section.children, (n) =>
                        n.kind === "leaf" ? n.category : undefined,
                      ).map((run) => {
                        const items = run.items.map((child) => (
                          <NavSubNode
                            key={nodeKey(child)}
                            node={child}
                            activeSlug={activeSlug}
                            hrefFor={hrefFor}
                            openDirs={openDirs}
                            onToggle={onToggle}
                            onNavigate={onNavigate}
                            badgeFor={badgeFor}
                          />
                        ));
                        return run.category ? (
                          <SidebarMenuSubItem key={`category:${run.category}`}>
                            <div className="px-2 pt-2 pb-1 text-xs font-medium text-sidebar-foreground/70">
                              {run.category}
                            </div>
                            <ul className="flex min-w-0 flex-col gap-1">
                              {items}
                            </ul>
                          </SidebarMenuSubItem>
                        ) : (
                          items
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
