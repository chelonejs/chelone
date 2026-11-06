import { ShowButton } from "@chelone/react";

export const mode = "record";

/** `<ShowButton>` renders a "Show" link to the first seeded post's show page; the link stays inert so the reader keeps the docs page. */
export default function ShowButtonDemo() {
  return <ShowButton onClick={(event) => event.preventDefault()} />;
}
