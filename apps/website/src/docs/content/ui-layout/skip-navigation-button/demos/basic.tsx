import { SkipNavigationButton } from "@chelone/react";

/** `<SkipNavigationButton>` sits above the viewport until a keyboard user tabs to it, then jumps to `#main-content`. */
export default function SkipNavigationButtonDemo() {
  return (
    <div>
      <SkipNavigationButton />
      <p className="text-sm text-muted-foreground">
        Press Tab to reveal the skip link.
      </p>
      <main id="main-content">Page content</main>
    </div>
  );
}
