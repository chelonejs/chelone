import { Confirm } from "@chelone/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** `<Confirm>` asks for confirmation before deleting a post. */
export default function ConfirmDemo() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="destructive" onClick={() => setIsOpen(true)}>
        Delete post
      </Button>
      <Confirm
        isOpen={isOpen}
        title="Delete this post?"
        content="This action cannot be undone."
        confirm="Delete"
        confirmColor="warning"
        onConfirm={() => setIsOpen(false)}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
