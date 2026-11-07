/**
 * A panel that plays "another user". Each button acts through the same wrapped
 * provider and lock provider as the app, so the events reach the open views
 * the way a second browser's would.
 */

import {
  createPresenceSession,
  type Identifier,
  type PresenceUser,
  presenceTopic,
} from "@chelone/core";
import { useGetLockLive, useNotify } from "@chelone/react";
import { Lock, Plus } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { dataProvider, locks } from "./realtime";

const buttonClass =
  "whitespace-nowrap rounded-md border px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground";

export interface SimulateOtherUserProps {
  /** The post the lock button takes. Defaults to the first seeded post. */
  postId?: Identifier;
}

function useSimulatedUser(postId: Identifier) {
  const notify = useNotify();
  const { data: lock } = useGetLockLive("posts", { id: postId });
  const heldByAlice = lock?.identity === "alice";

  const addPost = () =>
    dataProvider.create("posts", {
      data: {
        title: `Post added at ${new Date().toLocaleTimeString()}`,
        body: "Added by another user.",
        author_id: 1,
        views: 0,
        published: false,
      },
    });

  // The same button releases alice's lock, so the demo can always free a post.
  const toggleLock = () =>
    (heldByAlice ? locks.unlock : locks.lock)("posts", {
      id: postId,
      identity: "alice",
    }).catch((error: Error) => notify(error.message, { type: "error" }));

  return {
    addPostLabel: "Another user adds a post",
    lockLabel: `Another user ${heldByAlice ? "unlocks" : "locks"} post ${String(postId)}`,
    addPost,
    toggleLock,
  };
}

export function SimulateOtherUser({ postId = 1 }: SimulateOtherUserProps) {
  const { addPostLabel, lockLabel, addPost, toggleLock } =
    useSimulatedUser(postId);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={buttonClass} onClick={addPost}>
        {addPostLabel}
      </button>
      <button type="button" className={buttonClass} onClick={toggleLock}>
        {lockLabel}
      </button>
    </div>
  );
}

function SimulationMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  const { open, isMobile } = useSidebar();
  // The mobile drawer shows the full sidebar whatever the desktop rail does.
  const collapsed = !open && !isMobile;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        tooltip={label}
        aria-label={collapsed ? label : undefined}
        onClick={onClick}
      >
        {icon}
        {!collapsed && <span>{label}</span>}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * The same two buttons as sidebar entries, for a `<SidebarMenu>`. A collapsed
 * sidebar shows them as icon buttons, with the text as the tooltip and the
 * accessible name.
 */
export function SimulateOtherUserMenuItems({
  postId = 1,
}: SimulateOtherUserProps) {
  const { addPostLabel, lockLabel, addPost, toggleLock } =
    useSimulatedUser(postId);
  return (
    <>
      <SimulationMenuItem
        icon={<Plus />}
        label={addPostLabel}
        onClick={addPost}
      />
      <SimulationMenuItem
        icon={<Lock />}
        label={lockLabel}
        onClick={toggleLock}
      />
    </>
  );
}

const alice: PresenceUser = { id: "alice", name: "Alice Smith" };

/**
 * Another user with the post open: it announces itself on the post's presence
 * topic the way a second browser's `<PresenceBar>` would, so the bar shows
 * someone besides you.
 */
export function SimulatedViewer({
  postId,
  user = alice,
}: {
  postId: Identifier;
  user?: PresenceUser;
}) {
  useEffect(() => {
    const session = createPresenceSession({
      dataProvider,
      topic: presenceTopic("posts", postId),
      user,
    });
    session.start();
    return () => session.stop();
  }, [postId, user]);
  return null;
}
