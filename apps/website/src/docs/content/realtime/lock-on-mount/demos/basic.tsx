import { LockOnMount } from "@chelone/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const mode = "realtime";

/** Ada's `<LockOnMount>` takes the lock on post 1 and shows its children.
 *  Opening the same post as Grace finds it held, so Grace sees who has it
 *  instead. */
export default function LockOnMountDemo() {
  const [graceOpen, setGraceOpen] = useState(false);
  return (
    <div className="flex w-full max-w-sm flex-col items-start gap-4">
      <LockOnMount id={1} identity="ada">
        <p>Ada holds the lock on post 1 and can edit it.</p>
      </LockOnMount>
      {graceOpen ? (
        <LockOnMount id={1} identity="grace">
          <p>Grace holds the lock on post 1.</p>
        </LockOnMount>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setGraceOpen(true)}>
          Grace opens post 1
        </Button>
      )}
    </div>
  );
}
