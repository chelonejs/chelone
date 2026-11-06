import { Placeholder } from "@chelone/react";

/** `<Placeholder>` is the muted bar that holds a field's height until its value lands, here under the "Title" label. */
export default function PlaceholderDemo() {
  return (
    <p className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Title</span>
      <Placeholder className="h-5 w-40" />
    </p>
  );
}
