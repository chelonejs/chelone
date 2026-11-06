import { Title, TitlePortal } from "@chelone/react";

/** `<TitlePortal>` is the app-bar slot that shows the page `<Title>`. */
export default function TitlePortalDemo() {
  return (
    <header className="flex h-12 items-center rounded-md border px-4">
      <TitlePortal />
      <Title title="Authors" />
    </header>
  );
}
