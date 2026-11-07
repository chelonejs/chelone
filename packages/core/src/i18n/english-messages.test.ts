import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultMessages } from "./default-messages";
import { englishMessages } from "./english-messages";
import { createI18n } from "./i18n";

const packagesDir = join(__dirname, "../../..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|vue)$/.test(entry) && !/\.test\./.test(entry) ? [path] : [];
  });
}

/**
 * Keys whose call site passes its own caller-supplied text as the fallback, so
 * a catalog entry would shadow it (Vue's `<SortButton label>`).
 */
const callerOwned = new Set(["ra.sort.sort_by"]);

/** Every complete `ra.*` string literal in the React and Vue sources. */
function translatedKeys(): string[] {
  const keys = new Set<string>();
  for (const pkg of ["react", "vue"]) {
    for (const file of sourceFiles(join(packagesDir, pkg, "src"))) {
      const text = readFileSync(file, "utf8");
      // A key followed by `.` or `${` is a prefix of a dynamic key.
      for (const [, key] of text.matchAll(
        /["'`](ra\.[a-z_]+(?:\.[a-zA-Z_]+)+)["'`]/g,
      )) {
        if (key) keys.add(key);
      }
    }
  }
  return [...keys].filter((key) => !callerOwned.has(key)).sort();
}

describe("englishMessages", () => {
  it("carries every ra.* key the React and Vue components translate", () => {
    const missing = translatedKeys().filter((key) => !(key in englishMessages));
    expect(missing).toEqual([]);
  });

  it("keeps the chelone.* controller messages underneath the ra.* ones", () => {
    for (const key of Object.keys(defaultMessages)) {
      expect(englishMessages, `missing key: ${key}`).toHaveProperty([key]);
    }
  });

  it("no message uses a percent placeholder", () => {
    const percentPlaceholder = /%\{\w+\}/;
    const offenders = Object.entries(englishMessages)
      .filter(([, value]) =>
        typeof value === "string"
          ? percentPlaceholder.test(value)
          : Object.values(value).some(
              (text) => text !== undefined && percentPlaceholder.test(text),
            ),
      )
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  it("plugs into createI18n as a working English catalog", () => {
    const i18n = createI18n({
      locale: "en",
      messages: { en: englishMessages },
    });
    expect(i18n.translate("ra.page.create", { name: "Posts" })).toBe(
      "Create Posts",
    );
    expect(i18n.translate("ra.action.bulk_actions", { count: 3 })).toBe(
      "3 items selected",
    );
  });
});
