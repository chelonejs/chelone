import { UpdateButton } from "@chelone/react";

export const mode = "record";

/** `<UpdateButton>` renders a "Publish" button that patches the first seeded post to published and shows an Undo notification. */
export default function UpdateButtonDemo() {
  return <UpdateButton label="Publish" data={{ published: true }} />;
}
