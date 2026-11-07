/**
 * The app shell: the layout, its sidebar menu and what sits in it. A change to
 * the chrome edits this file only. The pages in `src/pages/` reach the menu
 * through `pages.tsx`.
 *
 * On every page: the command menu (Cmd+K or the Search button), the inspector
 * (the configure toggle), the assistant, the data provider devtools and the
 * welcome tour, which opens on a first visit and again from the user menu.
 */

import { onboardingTourKey } from "@chelone/core";
import {
  demoAssistantTools,
  demoAssistantTransport,
  TOUR_ID,
  tourSteps,
} from "@chelone/demo-data";
import {
  AppBar,
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
  useCommandMenu,
  useStore,
} from "@chelone/react";
import { Inspector, InspectorButton } from "@chelone/react/inspector";
import { BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { pageGroups } from "./pages";
import { dataProvider, dataProviderLog } from "./realtime";
import { SimulateOtherUser } from "./realtime-sim";

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

// Mod+1 to mod+9 open the first nine pages, in menu order.
const shortcuts = new Map(
  areas
    .flatMap((area) => pageGroups.find((g) => g.group === area)?.pages ?? [])
    .slice(0, 9)
    .map(({ path }, index) => [path, `mod+${index + 1}`]),
);

// Posts get a live unread badge; the other resources sit under their area.
// The panel is repeated here because the badge clears while /posts is open:
// adding a post from any other page is the only way to see it. It sits at the
// top of the sidebar: at the bottom it scrolls under the devtools panel.
function DemoMenu() {
  return (
    <>
      <div className="px-2 pt-2">
        <MenuLive
          items={[{ to: "/posts", resource: "posts", label: "Posts" }]}
        />
      </div>
      <div className="px-4 py-2">
        <SimulateOtherUser />
      </div>
      {areas.map((area) => {
        const resources = resourceAreas[area];
        const pages = pageGroups.find((g) => g.group === area)?.pages ?? [];
        return (
          <section key={area}>
            {resources ? (
              <ResourceMenuItemGroup label={area} resources={resources} />
            ) : (
              <h2 className="px-4 pt-2 text-xs font-medium text-muted-foreground">
                {area}
              </h2>
            )}
            <Menu>
              {pages.map(({ path, title }) => (
                <Menu.Item
                  key={path}
                  to={`/${path}`}
                  label={title}
                  icon={<FileText />}
                  keyboardShortcut={shortcuts.get(path)}
                />
              ))}
            </Menu>
          </section>
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

// The docs live beside the demo on the deployed site, so a new tab keeps the app open.
function DocsButton() {
  return (
    <IconButtonWithTooltip
      label="Documentation"
      onClick={() => window.open("/docs/", "_blank", "noopener")}
    >
      <BookOpen />
    </IconButtonWithTooltip>
  );
}

// The bar is sticky so that hiding it on scroll has something to hide.
function DemoAppBar() {
  return (
    <HideOnScroll className="sticky top-0 z-20 bg-background">
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

export function Shell(props: LayoutProps) {
  return (
    <CommandMenu>
      <Inspector>
        <Layout menu={DemoMenu} appBar={DemoAppBar} {...props} />
        <OnboardingTour id={TOUR_ID} steps={tourSteps} />
        <Assistant
          transport={assistantTransport}
          tools={assistantTools}
          welcomeMessage="Hi! Ask me how many posts there are."
        />
        <DataProviderDevtools
          log={dataProviderLog}
          defaultOpen={false}
          className="right-auto left-4"
        />
      </Inspector>
    </CommandMenu>
  );
}
