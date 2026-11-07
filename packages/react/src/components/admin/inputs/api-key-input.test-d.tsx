/**
 * `ApiKeyInput` hands `onRotate` the record it is generic over, so a callback
 * reads that record's fields without a cast.
 */

import { describe, expectTypeOf, it } from "vitest";
import type { ApiKeyInputProps } from "./api-key-input";

type Key = { id: number; label: string };

describe("ApiKeyInput", () => {
  it("onRotate receives the input's record", () => {
    type OnRotate = NonNullable<ApiKeyInputProps<Key>["onRotate"]>;
    expectTypeOf<Parameters<OnRotate>[0]>().toEqualTypeOf<Key>();
  });
});
