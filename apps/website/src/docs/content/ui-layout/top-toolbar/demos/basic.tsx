import { TopToolbar } from "@chelone/react";
import { Button } from "@/components/ui/button";

/** `<TopToolbar>` right-aligns a row of view actions. */
export default function TopToolbarDemo() {
  return (
    <TopToolbar>
      <Button variant="outline">Export</Button>
      <Button>Create</Button>
    </TopToolbar>
  );
}
