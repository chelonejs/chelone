import { LockStatus, useGetLockLive, useLock, useUnlock } from "@chelone/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const mode = "realtime";

/** Takes and releases post 1's lock as another identity. */
function OtherUserLock() {
  const { data: lock } = useGetLockLive("posts", { id: 1 });
  const { lock: take } = useLock();
  const { unlock } = useUnlock();
  const held = lock?.identity === "alice";
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        void (held ? unlock : take)("posts", { id: 1, identity: "alice" })
      }
    >
      Another user {held ? "unlocks" : "locks"} post 1
    </Button>
  );
}

/** `<LockStatus>` names the holder of post 1 and follows the lock as it is
 *  taken and released. `renderFree` fills the free state, which is empty by
 *  default. */
export default function LockStatusDemo() {
  return (
    <div className="flex flex-col items-start gap-4">
      <LockStatus
        id={1}
        renderFree={() => <Badge variant="outline">Post 1 is free</Badge>}
      />
      <OtherUserLock />
    </div>
  );
}
