/**
 * The app shell: the layout, its sidebar menu and what sits in it. A change to
 * the chrome edits this file only. The pages in `src/pages/` reach the menu
 * through `pages.tsx`.
 */

import {
  Layout,
  type LayoutProps,
  Menu,
  MenuLive,
  useResourceDefinitions,
} from "@chelone/react";
import { pageGroups } from "./pages";
import { SimulateOtherUser } from "./realtime-sim";

// Posts get a live unread badge; the other resources keep their plain links.
// The panel is repeated here because the badge clears while /posts is open:
// adding a post from any other page is the only way to see it.
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
      <div className="px-4 pt-2">
        <SimulateOtherUser />
      </div>
    </>
  );
}

export function Shell(props: LayoutProps) {
  return <Layout menu={DemoMenu} {...props} />;
}
