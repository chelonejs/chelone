import { DeleteButton } from "@chelone/react";

export const mode = "record";

/** `<DeleteButton>` for the current post; clicking it opens a confirm dialog before deleting. */
export default function DeleteButtonDemo() {
  return <DeleteButton />;
}
