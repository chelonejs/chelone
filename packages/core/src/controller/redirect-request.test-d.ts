import { describe, expectTypeOf, it } from "vitest";
import type { ResourceRecord } from "../resource/record";
import type { RedirectRequest } from "./record-controllers";

describe("RedirectRequest", () => {
  it("passes the saved record as a ResourceRecord or nothing", () => {
    expectTypeOf<Parameters<RedirectRequest>[3]>().toEqualTypeOf<
      ResourceRecord | undefined
    >();
  });

  it("rejects a string as the record", () => {
    const request: RedirectRequest = () => {};
    // @ts-expect-error the fourth argument is a record, not a string
    request("list", "posts", 1, "not a record");
    request("list", "posts", 1, { id: 1 });
  });
});
