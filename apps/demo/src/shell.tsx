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
  Layout,
  type LayoutProps,
  LocalesMenuButton,
  Menu,
  MenuLive,
  OnboardingTour,
  ThemeModeToggle,
  UserMenu,
  useCommandMenu,
  useResourceDefinitions,
  useStore,
} from "@chelone/react";
import { Inspector, InspectorButton } from "@chelone/react/inspector";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { pageGroups } from "./pages";
import { dataProvider, dataProviderLog } from "./realtime";
import { SimulateOtherUser } from "./realtime-sim";

// One transport and tool set for the app's lifetime: a new one starts a new conversation.
const assistantTransport = demoAssistantTransport();
const assistantTools = demoAssistantTools(dataProvider);

// Posts get a live unread badge; the other resources keep their plain links.
// The panel is repeated here because the badge clears while /posts is open:
// adding a post from any other page is the only way to see it. It sits at the
// top of the sidebar: at the bottom it scrolls under the devtools panel.
function DemoMenu() {
  const definitions = useResourceDefinitions();
  const others = Object.entries(definitions).filter(
    ([name, { hasList }]) => hasList && name !== "posts",
  );
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
      <Menu>
        {others.map(([name]) => (
          <Menu.ResourceItem key={name} name={name} />
        ))}
      </Menu>
      {pageGroups.map(({ group, pages }) => (
        <section key={group}>
          <h2 className="px-4 pt-2 text-xs font-medium text-muted-foreground">
            {group}
          </h2>
          <Menu>
            {pages.map(({ path, title }) => (
              <Menu.Item key={path} to={`/${path}`} label={title} />
            ))}
          </Menu>
        </section>
      ))}
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

function DemoAppBar() {
  return (
    <AppBar
      toolbar={
        <>
          <SearchButton />
          <InspectorButton data-tour="configure" />
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
