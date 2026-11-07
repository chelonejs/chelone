import { describe, expect, it } from "vitest";
import { makeDemoI18n } from "./i18n";

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

  it("tells subscribers, so a mounted component re-reads, and keeps the locale", async () => {
    const { i18n, missingKeys } = makeDemoI18n();
    i18n.setLocale("fr");
    i18n.translate("ra.action.refresh");
    const seen: string[] = [];
    i18n.subscribe(() => seen.push(i18n.translate("ra.action.refresh")));

    missingKeys.setTranslation("fr", "ra.action.refresh", "Actualiser");
    await flush();

    expect(seen.at(-1)).toBe("Actualiser");
    expect(i18n.getLocale()).toBe("fr");
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
});
