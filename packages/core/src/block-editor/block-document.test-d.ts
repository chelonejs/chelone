import { expectTypeOf, it } from "vitest";
import { z } from "zod";
import { type BlockSpec, getBlockDefaultAttrs } from "./block-document";

it("getBlockDefaultAttrs follows the schema output", () => {
  const schema = z.object({ title: z.string(), level: z.number().default(2) });
  expectTypeOf(getBlockDefaultAttrs(schema)).toEqualTypeOf<{
    title: string | null;
    level: number | null;
  }>();
});

it("a BlockSpec schema must output its attrs type", () => {
  const ok: BlockSpec<{ title: string }> = {
    name: "callout",
    label: "Callout",
    group: "Text",
    schema: z.object({ title: z.string() }),
  };
  expectTypeOf(ok.schema).not.toBeAny();

  const bad: BlockSpec<{ title: string }> = {
    name: "callout",
    label: "Callout",
    group: "Text",
    // @ts-expect-error the schema outputs a number, not a string
    schema: z.object({ title: z.number() }),
  };
  expectTypeOf(bad).toBeObject();
});
