/**
 * `<MonacoJsonField>`'s `defaultValue` is the fallback shown when the record has
 * nothing at `source`, so it is that field's value type, as every other display
 * field's is.
 */

import {
  defineResources,
  type RecordOf,
  type SourceProp,
  type SourceValue,
} from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { MonacoJsonFieldProps } from "./monaco-json-field";

const resources = defineResources({
  widgets: {
    schema: z.object({
      id: z.number(),
      payload: z.string(),
      layout: z.object({ columns: z.boolean() }),
    }),
  },
});

type Widget = RecordOf<typeof resources, "widgets">;
declare function acceptMonacoField(props: MonacoJsonFieldProps<Widget>): void;

describe("MonacoJsonField defaultValue", () => {
  it("MonacoJsonFieldProps<Widget> types the fallback by the record", () => {
    expectTypeOf<MonacoJsonFieldProps<Widget>["defaultValue"]>().toEqualTypeOf<
      SourceValue<Widget, SourceProp<Widget>> | undefined
    >();
    acceptMonacoField({ source: "payload", defaultValue: "null" });
    acceptMonacoField({ source: "layout", defaultValue: { columns: false } });
    // @ts-expect-error no path of a widget holds `{ columns: string }`
    acceptMonacoField({ source: "payload", defaultValue: { columns: "wide" } });
  });

  it("a widget the app never registered keeps the fallback open", () => {
    expectTypeOf<MonacoJsonFieldProps["defaultValue"]>().toBeUnknown();
  });
});
