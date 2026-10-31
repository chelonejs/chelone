import { describe, expect, it, vi } from "vitest";
import {
  createTranslatableController,
  getRecordForLocale,
} from "./translatable";

describe("createTranslatableController", () => {
  it("createTranslatableController starts on defaultLocale when it is listed", () => {
    const controller = createTranslatableController({
      locales: ["en", "fr", "de"],
      defaultLocale: "fr",
    });
    expect(controller.getSnapshot()).toEqual({
      locales: ["en", "fr", "de"],
      selectedLocale: "fr",
    });
  });

  it("createTranslatableController starts on the first locale when defaultLocale is absent or unlisted", () => {
    const absent = createTranslatableController({ locales: ["en", "fr"] });
    const unlisted = createTranslatableController({
      locales: ["en", "fr"],
      defaultLocale: "de",
    });
    expect(absent.getSnapshot().selectedLocale).toBe("en");
    expect(unlisted.getSnapshot().selectedLocale).toBe("en");
  });

  it("createTranslatableController notifies subscribers once per selectLocale change", () => {
    const controller = createTranslatableController({ locales: ["en", "fr"] });
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.selectLocale("fr");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().selectedLocale).toBe("fr");

    controller.selectLocale("fr");
    expect(listener).toHaveBeenCalledTimes(1);

    controller.selectLocale("en");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("createTranslatableController throws on empty locales and on an unlisted selectLocale", () => {
    expect(() => createTranslatableController({ locales: [] })).toThrow();
    const controller = createTranslatableController({ locales: ["en", "fr"] });
    expect(() => controller.selectLocale("de")).toThrow();
    expect(controller.getSnapshot().selectedLocale).toBe("en");
  });

  it("createTranslatableController stops notifying after destroy", () => {
    const controller = createTranslatableController({ locales: ["en", "fr"] });
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.destroy();
    controller.selectLocale("fr");
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("getRecordForLocale", () => {
  it("getRecordForLocale picks the locale value at any depth and inside arrays", () => {
    const record = {
      id: 1,
      title: { en: "a", fr: "b" },
      meta: { seo: { description: { en: "x", fr: "y" } } },
      sections: [
        { heading: { en: "h1", fr: "t1" } },
        { heading: { en: "h2", fr: "t2" } },
      ],
    };
    expect(getRecordForLocale(record, "fr")).toEqual({
      id: 1,
      title: "b",
      meta: { seo: { description: "y" } },
      sections: [{ heading: "t1" }, { heading: "t2" }],
    });
  });

  it("getRecordForLocale leaves nodes without the locale and never mutates the input", () => {
    const record = {
      title: { en: "a" },
      tags: ["x", "y"],
      author: { name: "Ada" },
      count: 3,
    };
    const snapshot = structuredClone(record);
    const result = getRecordForLocale(record, "fr");
    expect(result).toEqual(snapshot);
    expect(record).toEqual(snapshot);
    expect(result).not.toBe(record);
    expect(result.tags).not.toBe(record.tags);
  });

  it("getRecordForLocale returns null and undefined as given", () => {
    expect(getRecordForLocale(null, "fr")).toBeNull();
    expect(getRecordForLocale(undefined, "fr")).toBeUndefined();
  });

  it("getRecordForLocale never replaces the record itself, even when a field is named like the locale", () => {
    const record = { id: 1, title: { en: "a", id: "b" } };
    expect(getRecordForLocale(record, "id")).toEqual({ id: 1, title: "b" });
  });

  it("getRecordForLocale only picks from objects whose keys are all listed locales when locales are given", () => {
    const record = {
      id: 1,
      author: { id: 7, name: "Ada" },
      title: { en: "a", id: "b" },
    };
    expect(getRecordForLocale(record, "id", ["en", "id"])).toEqual({
      id: 1,
      author: { id: 7, name: "Ada" },
      title: "b",
    });
  });
});
