import { describe, expectTypeOf, it } from "vitest";
import type { AssistantTool, JsonObject, JsonValue } from "./types";

describe("assistant types", () => {
  it("a handler takes the model's JSON arguments and returns JSON", () => {
    const tool: AssistantTool = {
      description: "d",
      parameters: { type: "object" },
      handler: (args) => {
        expectTypeOf(args).toEqualTypeOf<JsonObject>();
        return { ok: true };
      },
    };
    expectTypeOf(tool.handler).returns.toEqualTypeOf<
      JsonValue | undefined | Promise<JsonValue | undefined>
    >();

    // @ts-expect-error a Date is not JSON, so the model could not read it
    const bad: AssistantTool = { ...tool, handler: () => new Date() };
    void bad;
  });
});
