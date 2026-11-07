import { describe, expect, it } from "vitest";
import { makeDemoI18n, makeI18n } from "./i18n";

const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe("the demo i18n", () => {
  it("offers English and French, English first", () => {
    const { i18n } = makeDemoI18n();

    expect(i18n.getLocales()).toEqual(["en", "fr"]);
    expect(i18n.getLocale()).toBe("en");
  });

  it("reports a key the French catalog lacks and shows its English meanwhile", () => {
    const { i18n, missingKeys } = makeDemoI18n();
    i18n.setLocale("fr");

    expect(i18n.translate("ra.action.refresh")).toBe("Refresh");
    expect(missingKeys.getEntries("fr").map((entry) => entry.key)).toContain(
      "ra.action.refresh",
    );
  });

  it("changes the string once a translation is typed for the missing key", async () => {
    const { i18n, missingKeys } = makeDemoI18n();
    i18n.setLocale("fr");
    i18n.translate("ra.action.refresh");

    missingKeys.setTranslation("fr", "ra.action.refresh", "Actualiser");
    await flush();

    expect(i18n.translate("ra.action.refresh")).toBe("Actualiser");
  });

  it("tells subscribers once the new text is in place, and keeps the locale", async () => {
    const demo = makeDemoI18n();
    demo.i18n.setLocale("fr");
    demo.i18n.translate("ra.action.refresh");
    const seen: string[] = [];
    demo.subscribe(() => seen.push(demo.i18n.translate("ra.action.refresh")));
    const before = demo.version();

    demo.missingKeys.setTranslation("fr", "ra.action.refresh", "Actualiser");
    await flush();

    expect(seen).toEqual(["Actualiser"]);
    expect(demo.version()).not.toBe(before);
    expect(demo.i18n.getLocale()).toBe("fr");
  });

  it("stays quiet when a key is recorded but nothing was typed", async () => {
    const demo = makeDemoI18n();
    const seen: string[] = [];
    demo.subscribe(() => seen.push("changed"));

    demo.missingKeys.record("demo.unknown", "en", undefined);
    await flush();

    expect(seen).toEqual([]);
  });

  it("goes back to English when the typed translation is cleared", async () => {
    const { i18n, missingKeys } = makeDemoI18n();
    i18n.setLocale("fr");
    i18n.translate("ra.action.refresh");
    missingKeys.setTranslation("fr", "ra.action.refresh", "Actualiser");
    await flush();

    missingKeys.setTranslation("fr", "ra.action.refresh", "");
    await flush();

    expect(i18n.translate("ra.action.refresh")).toBe("Refresh");
  });

  it("keeps an English translation typed here out of every other i18n", async () => {
    const first = makeDemoI18n();
    first.i18n.translate("demo.team.title", { _: "Team" });
    first.missingKeys.setTranslation("en", "demo.team.title", "Crew");
    await flush();
    expect(first.i18n.translate("demo.team.title", { _: "Team" })).toBe("Crew");

    const second = makeDemoI18n();
    expect(second.i18n.translate("demo.team.title", { _: "Team" })).toBe(
      "Team",
    );
    expect(makeI18n().translate("demo.team.title", { _: "Team" })).toBe("Team");
  });
});
