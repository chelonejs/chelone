/**
 * The app shell: the layout, its sidebar menu and what sits in it. A change to
 * the chrome edits this file only. The pages in `src/pages/` reach the menu
 * through `pages.tsx`.
 *
 * On every page: the command menu (Cmd+K or the Search button), the inspector
 * (the configure toggle), the assistant, the data provider devtools and the
 * welcome tour, which opens on a first visit and again from the user menu.
 */

import { type CanAccessParams, onboardingTourKey } from "@chelone/core";
import {
  demoAssistantTools,
  demoAssistantTransport,
  demoMenuKey,
  routeAccess,
  TOUR_ID,
  tourSteps,
} from "@chelone/demo-data";
import {
  AppBar,
  AppSidebar,
  type AppSidebarProps,
  Assistant,
  CommandMenu,
  DataProviderDevtools,
  HideOnScroll,
  IconButtonWithTooltip,
  Layout,
  type LayoutProps,
  LoadingIndicator,
  LocalesMenuButton,
  Menu,
  MenuLive,
  OnboardingTour,
  ResourceMenuItemGroup,
  ThemeModeToggle,
  UserMenu,
  useCanAccess,
  useCommandMenu,
  useGetResourceLabel,
  useLocation,
  useRedirect,
  useStore,
  useTranslate,
} from "@chelone/react";
import { Inspector, InspectorButton } from "@chelone/react/inspector";
import {
  Activity,
  CalendarDays,
  ClipboardCheck,
  HeartPulse,
  KeyRound,
  Layers,
  LayoutTemplate,
  LogIn,
  type LucideIcon,
  Newspaper,
  Plug,
  SquareKanban,
  UserCog,
} from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { pageGroups } from "./pages";
import { dataProvider, dataProviderLog } from "./realtime";
import { SimulateOtherUser } from "./realtime-sim";
import { resources } from "./resources";

// One transport and tool set for the app's lifetime: a new one starts a new conversation.
const assistantTransport = demoAssistantTransport();
const assistantTools = demoAssistantTools(dataProvider);

// The area each resource sits under. A resource missing here is not in the menu.
const resourceAreas: Record<string, string[]> = {
  Catalog: ["products"],
  Content: ["pages", "categories", "tags"],
  Orders: ["orders"],
  Shop: ["customers", "places"],
  Team: ["authors"],
};

const areas = [
  ...new Set([
    ...Object.keys(resourceAreas),
    ...pageGroups.map((g) => g.group),
  ]),
].sort((a, b) => a.localeCompare(b));

// One glyph per page, by route. A page missing here shows none, which the
// sidebar test catches. Dashboard and the resources have theirs elsewhere (the
// menu's house, each `<Resource icon>`).
const pageIcons: Record<string, LucideIcon> = {
  activity: Activity,
  approvals: ClipboardCheck,
  integrations: Plug,
  "landing-page": LayoutTemplate,
  login: LogIn,
  "order-board": SquareKanban,
  "order-calendar": CalendarDays,
  "product-variants": Layers,
  status: HeartPulse,
  "supabase-auth": KeyRound,
  team: UserCog,
};

// Mod+1 to mod+9 open the first nine pages, in menu order.
const shortcuts = new Map(
  areas
    .flatMap((area) => pageGroups.find((g) => g.group === area)?.pages ?? [])
    .slice(0, 9)
    .map(({ path }, index) => [path, `mod+${index + 1}`]),
);

// The mark sits in this app's own public/ folder, so the URL carries Vite's base
// (`/demo/`) rather than pointing at the website's copy.
const logoSrc = `${import.meta.env.BASE_URL}chelone-mark.svg`;

/**
 * The sidebar header brands the demo as part of the site: the Chelone mark and
 * name link back to the site home, not to this app's dashboard. The demos are
 * separate SPAs under `/demo/`, so the home link is `brandHref`, a plain anchor:
 * `brandTo` is a router link and would prefix the basename.
 */
function DemoSidebar({ children, ...props }: AppSidebarProps) {
  return (
    <AppSidebar
      {...props}
      brandIcon={<img src={logoSrc} alt="" width={20} height={20} />}
      brandHref="/"
    >
      {children}
    </AppSidebar>
  );
}

// Posts get a live unread badge; the other resources sit under their area.
// The panel is repeated here because the badge clears while /posts is open:
// adding a post from any other page is the only way to see it. It sits at the
// top of the sidebar: at the bottom it scrolls under the devtools panel.
function DemoMenu() {
  const translate = useTranslate();
  const getResourceLabel = useGetResourceLabel();
  return (
    <>
      <div className="px-2 pt-2">
        <MenuLive
          items={[
            {
              to: "/posts",
              resource: "posts",
              label: getResourceLabel("posts"),
              icon: <Newspaper size={16} className="shrink-0" />,
            },
          ]}
        />
      </div>
      <div className="px-4 py-2">
        <SimulateOtherUser />
      </div>
      <Menu>
        <Menu.DashboardItem />
      </Menu>
      {areas.map((area) => {
        const pages = pageGroups.find((g) => g.group === area)?.pages ?? [];
        return (
          <ResourceMenuItemGroup
            key={area}
            label={translate(demoMenuKey("group", area), { _: area })}
            resources={resourceAreas[area] ?? []}
          >
            {pages.map(({ path, title }) => {
              const PageIcon = pageIcons[path];
              return (
                <Menu.Item
                  key={path}
                  to={`/${path}`}
                  label={translate(demoMenuKey("page", path), { _: title })}
                  icon={PageIcon && <PageIcon />}
                  keyboardShortcut={shortcuts.get(path)}
                />
              );
            })}
          </ResourceMenuItemGroup>
        );
      })}
    </>
  );
}

function SearchButton() {
  const { open } = useCommandMenu();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-tour="search"
      onClick={open}
    >
      Search
      <span className="text-xs text-muted-foreground">⌘K</span>
    </Button>
  );
}

// The tour opens while its stored flag is not `true`, so clearing it replays it.
function TakeTheTour() {
  const [, setDone] = useStore(onboardingTourKey(TOUR_ID), false);
  return (
    <DropdownMenuItem onSelect={() => setDone(false)}>
      Take the tour
    </DropdownMenuItem>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function DocsIcon() {
  return (
    <Icon>
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </Icon>
  );
}

// The docs live beside the demo on the deployed site, so a new tab keeps the app open.
function DocsButton() {
  return (
    <IconButtonWithTooltip
      label="Documentation"
      onClick={() => window.open("/docs/", "_blank", "noopener")}
    >
      <DocsIcon />
    </IconButtonWithTooltip>
  );
}

// The bar is sticky so that hiding it on scroll has something to hide. index.css lets the page scroll under it.
function DemoAppBar() {
  return (
    <HideOnScroll className="demo-app-bar sticky top-0 z-20 bg-background">
      <DemoBar />
    </HideOnScroll>
  );
}

function DemoBar() {
  return (
    <AppBar
      toolbar={
        <>
          <SearchButton />
          <InspectorButton data-tour="configure" />
          <DocsButton />
          <LoadingIndicator className="mx-2" />
          <LocalesMenuButton />
          <ThemeModeToggle />
        </>
      }
      userMenu={
        <UserMenu>
          <TakeTheTour />
        </UserMenu>
      }
    />
  );
}

function Checked({
  params,
  children,
}: {
  params: CanAccessParams;
  children: ReactNode;
}) {
  const { data: allowed } = useCanAccess(params);
  const redirect = useRedirect();
  useEffect(() => {
    if (allowed === false) redirect("/access-denied");
  }, [allowed, redirect]);
  return allowed === false ? null : children;
}

// A role that may not open the page it is on is sent to /access-denied, as the
// viewer is from /posts/create. The menu already hides what a role may not
// list; this covers a typed or followed URL.
function AccessGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const params = routeAccess(pathname, Object.keys(resources));
  return params ? <Checked params={params}>{children}</Checked> : children;
}

export function Shell({ children, ...props }: LayoutProps) {
  return (
    <CommandMenu>
      <Inspector>
        <Layout
          menu={DemoMenu}
          appBar={DemoAppBar}
          sidebar={DemoSidebar}
          {...props}
        >
          <AccessGuard>{children}</AccessGuard>
        </Layout>
        <OnboardingTour id={TOUR_ID} steps={tourSteps} />
        <Assistant
          transport={assistantTransport}
          tools={assistantTools}
          welcomeMessage="Hi! Ask me how many posts there are."
        />
        {/* Left of the Assistant trigger, which sits at `bottom-4 right-4`.
            Below `md` the panel would run off the left edge at that offset, so
            the button moves above the Assistant trigger instead. */}
        <DataProviderDevtools
          log={dataProviderLog}
          defaultOpen={false}
          className="max-md:bottom-20 md:right-32"
        />
      </Inspector>
    </CommandMenu>
  );
}
