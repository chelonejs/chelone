import { Notification, useNotify } from "@chelone/react";
import { Button } from "@/components/ui/button";

function ToastButton() {
  const notify = useNotify();
  return (
    <Button
      type="button"
      onClick={() => notify("Post saved", { type: "success" })}
    >
      Fire a notification
    </Button>
  );
}

/** `<Notification>` renders the queue `useNotify` pushes into: press the button and a success toast with a close button slides in at the bottom of the screen. */
export default function NotificationDemo() {
  return (
    <>
      <ToastButton />
      <Notification />
    </>
  );
}
