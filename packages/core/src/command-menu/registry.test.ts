import { describe, expect, it, vi } from "vitest";
import {
  type CommandAction,
  createCommandRegistry,
  getVisibleCommands,
  groupCommands,
} from "./registry";

type TestAction = CommandAction<string, string>;

const action = (id: string, extra: Partial<TestAction> = {}): TestAction => ({
  id,
  label: id,
  onSelect: () => {},
  ...extra,
});

const ids = (commands: readonly TestAction[]) => commands.map((c) => c.id);

describe("createCommandRegistry", () => {
  it("register adds a command and unregister removes it", () => {
    const registry = createCommandRegistry<string, string>();
    const listener = vi.fn();
    registry.store.subscribe(listener);

    registry.register(action("a"));
    registry.register(action("b"));
    expect(ids(registry.store.getSnapshot().commands)).toEqual(["a", "b"]);
    expect(listener).toHaveBeenCalledTimes(2);

    registry.unregister("a");
    expect(ids(registry.store.getSnapshot().commands)).toEqual(["b"]);
  });

  it("register replaces a command with the same id", () => {
    const registry = createCommandRegistry<string, string>();
    registry.register(action("a", { label: "first" }));
    registry.register(action("b"));
    registry.register(action("a", { label: "second" }));

    const { commands } = registry.store.getSnapshot();
    expect(ids(commands)).toEqual(["a", "b"]);
    expect(commands[0]?.label).toBe("second");
  });

  it("a stale cleanup does not remove a newer registration of the same id", () => {
    const registry = createCommandRegistry<string, string>();
    const staleCleanup = registry.register(action("a", { label: "first" }));
    const freshCleanup = registry.register(action("a", { label: "second" }));

    staleCleanup();
    expect(registry.store.getSnapshot().commands[0]?.label).toBe("second");

    freshCleanup();
    expect(registry.store.getSnapshot().commands).toEqual([]);
  });
});

describe("getVisibleCommands", () => {
  it("drops commands whose when returns false or throws", () => {
    const commands = [
      action("no-when"),
      action("shown", { when: () => true }),
      action("hidden", { when: () => false }),
      action("throws", {
        when: () => {
          throw new Error("boom");
        },
      }),
    ];
    expect(ids(getVisibleCommands(commands))).toEqual(["no-when", "shown"]);
  });
});

describe("groupCommands", () => {
  it("groups in first-seen order and puts a missing group under actions", () => {
    const grouped = groupCommands([
      action("a", { group: "navigation" }),
      action("b"),
      action("c", { group: "navigation" }),
      action("d", { group: "actions" }),
      action("e", { group: "theme" }),
    ]);
    expect(grouped.map(([group, commands]) => [group, ids(commands)])).toEqual([
      ["navigation", ["a", "c"]],
      ["actions", ["b", "d"]],
      ["theme", ["e"]],
    ]);
  });
});
