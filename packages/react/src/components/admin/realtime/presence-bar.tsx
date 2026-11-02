import { getPresenceInitials } from "@chelone/core";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { usePresence } from "../../../presence-hooks";

export interface PresenceBarProps {
  /** Defaults to the presence topic of the resource and record contexts. */
  topic?: string;
  /** Replaces the auth provider's identity as the user who is announced. */
  currentUser?: { id: string; name: string; avatar?: string };
  /** How many avatars to show before the rest collapse into a `+N` count. Default 5. */
  maxAvatars?: number;
  /** How often the announce is republished. Default 15000. */
  heartbeatMs?: number;
  /** A user unheard for longer than this is dropped. Default 30000. */
  staleMs?: number;
  className?: string;
}

/**
 * Shows the other users who have the same record open. Renders nothing when
 * nobody else is there. Needs a realtime data provider.
 *
 * @example
 * import { PresenceBar } from "@chelone/react";
 *
 * export const PostPresence = () => <PresenceBar />;
 */
function PresenceBar({
  topic,
  currentUser,
  maxAvatars = 5,
  heartbeatMs,
  staleMs,
  className,
}: PresenceBarProps) {
  const users = usePresence({
    topic,
    user: currentUser,
    heartbeatMs,
    staleMs,
  });

  if (users.length === 0) return null;
  const visible = users.slice(0, maxAvatars);
  const hidden = users.length - visible.length;

  return (
    <AvatarGroup data-slot="presence-bar" className={className}>
      {visible.map((user) => (
        <Avatar
          key={user.id}
          size="sm"
          data-presence-user={user.id}
          title={user.name}
        >
          {user.avatar ? (
            <AvatarImage src={user.avatar} alt={user.name} />
          ) : null}
          <AvatarFallback>{getPresenceInitials(user.name)}</AvatarFallback>
        </Avatar>
      ))}
      {hidden > 0 ? <AvatarGroupCount>+{hidden}</AvatarGroupCount> : null}
    </AvatarGroup>
  );
}

export { PresenceBar };
