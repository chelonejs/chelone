import { describe, expect, it } from "vitest";
import { tanstackRouterAdapter } from "./tanstack-router";

describe("@chelone/react/tanstack-router", () => {
  it("the subpath exports the TanStack router adapter", () => {
    expect(tanstackRouterAdapter).toBeTypeOf("object");
    expect(tanstackRouterAdapter.Routes).toBeTypeOf("function");
    expect(tanstackRouterAdapter.useNavigate).toBeTypeOf("function");
  });
});
