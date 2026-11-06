/**
 * `<MonacoJsonInput>` inherits `defaultValue` from `InputProps` rather than
 * declaring its own: it is the value the record holds at the field the editor
 * opens.
 */

import { defineResources, type RecordOf } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { InputProps } from "../admin/input-props";
import type { MonacoJsonInputProps } from "./monaco-json-input";

const resources = defineResources({
  widgets: {
    schema: z.object({
      payload: z.string(),
      layout: z.object({ columns: z.boolean() }),
    }),
  },
});

type Widget = RecordOf<typeof resources, "widgets">;
declare function acceptMonaco(props: MonacoJsonInputProps<Widget>): void;

describe("MonacoJsonInput defaultValue", () => {
  it("MonacoJsonInputProps<Widget> takes the prop InputProps types", () => {
    expectTypeOf<MonacoJsonInputProps<Widget>["defaultValue"]>().toEqualTypeOf<
      InputProps<Widget>["defaultValue"]
    >();
    expectTypeOf<
      MonacoJsonInputProps<Widget>["defaultValue"]
    >().not.toBeUnknown();
    acceptMonaco({ source: "payload", defaultValue: "{}" });
    acceptMonaco({ source: "layout", defaultValue: { columns: true } });
    // @ts-expect-error no path of a widget holds a number
    acceptMonaco({ source: "payload", defaultValue: 3 });
  });

  it("a widget the app never registered keeps the default open", () => {
    expectTypeOf<MonacoJsonInputProps["defaultValue"]>().toBeUnknown();
  });
});
