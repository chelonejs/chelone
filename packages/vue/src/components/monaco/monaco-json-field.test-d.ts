/**
 * The Vue `<MonacoJsonField>` pair is generic in its record: the fallback shown
 * for a missing value is the value at `source`, and the lazy SFC's `#empty` slot
 * returns nodes. #1061 typed the eager half and left `empty?: () => unknown`
 * behind in the lazy one.
 */

import { defineResources, type RecordOf } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { VNode } from "vue";
import { z } from "zod";
import type { MonacoJsonFieldProps } from "./monaco-json-field.vue";
import type MonacoJsonFieldLazy from "./monaco-json-field-lazy.vue";

const resources = defineResources({
  widgets: {
    schema: z.object({
      id: z.number(),
      payload: z.string(),
      settings: z.object({ dark: z.boolean() }),
    }),
  },
});

type Widget = RecordOf<typeof resources, "widgets">;
type LazySlots = NonNullable<
  Parameters<typeof MonacoJsonFieldLazy>[1]
>["slots"];

describe("the Vue MonacoJsonField record generic", () => {
  it("takes the fallback from the value at its source", () => {
    const text: MonacoJsonFieldProps<Widget> = {
      source: "payload",
      defaultValue: "null",
    };
    const object: MonacoJsonFieldProps<Widget> = {
      source: "settings",
      defaultValue: { dark: true },
    };
    void [text, object];
  });

  it("rejects a fallback the source cannot hold", () => {
    const wrong: MonacoJsonFieldProps<Widget> = {
      source: "payload",
      // @ts-expect-error `payload` holds a string, not `{ dark: string }`
      defaultValue: { dark: "night" },
    };
    void wrong;
  });

  it("the lazy SFC carries the same fallback and a slot of nodes", () => {
    expectTypeOf<
      Parameters<typeof MonacoJsonFieldLazy>[0]["defaultValue"]
    >().toEqualTypeOf<MonacoJsonFieldProps["defaultValue"]>();
    expectTypeOf<NonNullable<LazySlots["empty"]>>().returns.toEqualTypeOf<
      VNode[]
    >();
  });

  it("a record the app never registered keeps the fallback open", () => {
    expectTypeOf<MonacoJsonFieldProps["defaultValue"]>().toBeUnknown();
  });
});
