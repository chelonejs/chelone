import { expectTypeOf, it } from "vitest";
import type { CommandMenuAction } from "./command-menu-context";

it("a command's onSelect may return a promise", () => {
  expectTypeOf<CommandMenuAction["onSelect"]>().toEqualTypeOf<
    () => void | Promise<void>
  >();
});
