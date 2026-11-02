import { describe, expect, it } from "vitest";
import {
  type HotkeyEvent,
  isTypingTarget,
  matchesHotkey,
  shouldHandleHotkey,
} from "./hotkey";

const press = (key: string, mods: Partial<HotkeyEvent> = {}): HotkeyEvent => ({
  key,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

describe("matchesHotkey", () => {
  it("matches mod+k on Meta and on Ctrl", () => {
    expect(matchesHotkey(press("k", { metaKey: true }), "mod+k")).toBe(true);
    expect(matchesHotkey(press("k", { ctrlKey: true }), "mod+k")).toBe(true);
    expect(matchesHotkey(press("k"), "mod+k")).toBe(false);
    expect(matchesHotkey(press("j", { metaKey: true }), "mod+k")).toBe(false);
  });

  it("is case-insensitive and needs exact shift and alt", () => {
    expect(matchesHotkey(press("K", { metaKey: true }), "MOD+k")).toBe(true);
    expect(
      matchesHotkey(
        press("P", { metaKey: true, shiftKey: true }),
        "mod+shift+p",
      ),
    ).toBe(true);
    expect(matchesHotkey(press("p", { metaKey: true }), "mod+shift+p")).toBe(
      false,
    );
    expect(
      matchesHotkey(press("k", { metaKey: true, shiftKey: true }), "mod+k"),
    ).toBe(false);
    expect(matchesHotkey(press("/", { altKey: true }), "alt+/")).toBe(true);
    expect(matchesHotkey(press("/"), "alt+/")).toBe(false);
    expect(matchesHotkey(press("/", { altKey: true }), "/")).toBe(false);
  });

  it("does not fire a binding without mod while Ctrl or Meta is down", () => {
    expect(matchesHotkey(press("k"), "k")).toBe(true);
    expect(matchesHotkey(press("k", { ctrlKey: true }), "k")).toBe(false);
    expect(matchesHotkey(press("k", { metaKey: true }), "k")).toBe(false);
    expect(matchesHotkey(press("/", { ctrlKey: true }), "alt+/")).toBe(false);
  });

  it("matches a bare key such as f1", () => {
    expect(matchesHotkey(press("F1"), "f1")).toBe(true);
    expect(matchesHotkey(press("F2"), "f1")).toBe(false);
  });
});

describe("isTypingTarget", () => {
  it("is true for input, textarea, select and contenteditable", () => {
    expect(isTypingTarget({ tagName: "INPUT" })).toBe(true);
    expect(isTypingTarget({ tagName: "textarea" })).toBe(true);
    expect(isTypingTarget({ tagName: "SELECT" })).toBe(true);
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(
      true,
    );
    expect(isTypingTarget({ tagName: "DIV" })).toBe(false);
    expect(isTypingTarget({})).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe("shouldHandleHotkey", () => {
  it("ignores a match during IME composition", () => {
    const event = press("k", { metaKey: true, isComposing: true });
    expect(shouldHandleHotkey(event, "mod+k", { tagName: "BODY" })).toBe(false);
    expect(
      shouldHandleHotkey({ ...event, isComposing: false }, "mod+k", null),
    ).toBe(true);
  });

  it("ignores a bare-key binding while typing in an input, a textarea or a contenteditable", () => {
    const slash = press("/");
    expect(shouldHandleHotkey(slash, "/", { tagName: "BODY" })).toBe(true);
    expect(shouldHandleHotkey(slash, "/", { tagName: "INPUT" })).toBe(false);
    expect(shouldHandleHotkey(slash, "/", { tagName: "TEXTAREA" })).toBe(false);
    expect(
      shouldHandleHotkey(slash, "/", {
        tagName: "DIV",
        isContentEditable: true,
      }),
    ).toBe(false);
    expect(shouldHandleHotkey(press("F1"), "f1", { tagName: "INPUT" })).toBe(
      false,
    );
  });

  it("still fires mod+k while typing", () => {
    const input = { tagName: "INPUT" };
    expect(
      shouldHandleHotkey(press("k", { ctrlKey: true }), "mod+k", input),
    ).toBe(true);
    expect(
      shouldHandleHotkey(press("/", { altKey: true }), "alt+/", input),
    ).toBe(true);
  });
});
