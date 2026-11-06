import { Title, TitlePortal } from "@chelone/react";

/** `<Title>` shows "Posts" in the `<TitlePortal>` slot it teleports to. */
export default function TitleDemo() {
  return (
    <header className="flex h-12 items-center rounded-md border px-4">
      <TitlePortal />
      <Title title="Posts" />
    </header>
  );
}
