import { SimpleListLoading } from "@chelone/react";

/** `<SimpleListLoading>` shows placeholder rows for a list that is still loading, and only after a one-second grace period, so a fast response never flashes a skeleton. */
export default function SimpleListLoadingDemo() {
  return (
    <div className="w-full">
      <p className="px-4 py-2 text-sm text-muted-foreground">
        Posts, while the first page is still loading
      </p>
      <SimpleListLoading nbFakeLines={3} hasSecondaryText />
    </div>
  );
}
