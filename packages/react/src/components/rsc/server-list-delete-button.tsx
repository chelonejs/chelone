"use client";

import { englishMessages, type Identifier } from "@chelone/core";
import { useState } from "react";
import { useRevalidate } from "../../router/nav-hooks";
import { Button } from "../ui/button";

interface ServerListDeleteButtonProps {
  /** The id of the row's record, passed to `onDelete`. */
  id: Identifier;
  /** The app's server function. The list is revalidated once it resolves. */
  onDelete: (id: Identifier) => Promise<unknown>;
  /** Button text. Defaults to the English `chelone.action.*` messages. */
  labels?: { delete?: string; confirm?: string; cancel?: string };
}

/**
 * A row's delete action for the `rowActions` slot of a `<ServerList>`. A click
 * asks to confirm inline; confirm awaits `onDelete(id)`, then asks the router
 * to re-run the list's server data. There is no undo and no optimistic removal:
 * the row goes when the server renders the page again. A rejection shows its
 * message and revalidates nothing.
 *
 * @example
 * <ServerListDeleteButton id={post.id} onDelete={(id) => deletePost({ data: id })} />
 */
function ServerListDeleteButton({
  id,
  onDelete,
  labels,
}: ServerListDeleteButtonProps) {
  const revalidate = useRevalidate();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const text = {
    delete: labels?.delete ?? englishMessages["chelone.action.delete"],
    confirm: labels?.confirm ?? englishMessages["chelone.action.confirm"],
    cancel: labels?.cancel ?? englishMessages["chelone.action.cancel"],
  };

  const confirm = async () => {
    setPending(true);
    setError(undefined);
    try {
      await onDelete(id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setPending(false);
      return;
    }
    setPending(false);
    setConfirming(false);
    revalidate();
  };

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        {text.delete}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={confirm}
      >
        {text.confirm}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          setConfirming(false);
          setError(undefined);
        }}
      >
        {text.cancel}
      </Button>
      {error !== undefined && (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}

export { ServerListDeleteButton, type ServerListDeleteButtonProps };
