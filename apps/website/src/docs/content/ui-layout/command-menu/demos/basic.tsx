import { CommandMenu, useCommandMenu } from "@chelone/react";
import { Button } from "@/components/ui/button";

function SearchButton() {
  const { open } = useCommandMenu();
  return (
    <Button variant="outline" onClick={open}>
      Search <span className="text-muted-foreground text-xs">Ctrl+K</span>
    </Button>
  );
}

/** `<CommandMenu>` opens from this button or from `Ctrl+K` and lists the resources to jump to. */
export default function CommandMenuDemo() {
  return (
    <CommandMenu>
      <SearchButton />
    </CommandMenu>
  );
}
