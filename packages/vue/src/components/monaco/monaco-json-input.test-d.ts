/**
 * `<MonacoJsonInput>` is generic in its record and its `source`, so
 * `defaultValue` is the value at that `source`. The Vue twin of
 * `@chelone/react`'s `monaco/monaco-json-input.tsx`.
 */

import { defineResources, type RecordOf } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { MonacoJsonInputProps } from "./monaco-json-input.vue";

const resources = defineResources({
  widgets: {
    schema: z.object({
      payload: z.string(),
      settings: z.object({ dark: z.boolean() }),
    }),
  },
});

type Widget = RecordOf<typeof resources, "widgets">;
declare function acceptMonaco(
  props: MonacoJsonInputProps<Widget, "settings">,
): void;

describe("the Vue MonacoJsonInput defaultValue", () => {
  it("the props type holds the source literal and the value at it", () => {
    expectTypeOf<
      MonacoJsonInputProps<Widget, "settings">["source"]
    >().toEqualTypeOf<"settings">();
    expectTypeOf<
      MonacoJsonInputProps<Widget, "settings">["defaultValue"]
    >().not.toBeUnknown();
    acceptMonaco({ source: "settings", defaultValue: { dark: true } });
    // @ts-expect-error `settings` holds an object, not a string
    acceptMonaco({ source: "settings", defaultValue: "{}" });
  });

  it("the source is a path of the record the props name", () => {
    // @ts-expect-error `settingz` is no path of a widget
    acceptMonaco({ source: "settingz", defaultValue: { dark: true } });
  });

  it("the loose component keeps an untyped default", () => {
    expectTypeOf<MonacoJsonInputProps["defaultValue"]>().toBeUnknown();
  });
});
