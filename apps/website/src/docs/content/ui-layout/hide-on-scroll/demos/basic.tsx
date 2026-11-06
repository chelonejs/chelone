import { HideOnScroll } from "@chelone/react";

/** `<HideOnScroll>` hides a header as the page scrolls down and reveals it on scroll up. */
export default function HideOnScrollDemo() {
  return (
    <div className="w-full overflow-hidden rounded-md border">
      <HideOnScroll className="bg-muted p-4 font-medium">
        Posts toolbar
      </HideOnScroll>
      <p className="p-4 text-sm text-muted-foreground">
        Scroll the page down, then up to reveal the toolbar again.
      </p>
    </div>
  );
}
