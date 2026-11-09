/**
 * A form whose fields belong to no resource types its inputs against its own
 * values, so a registered app does not have to find `email` in a resource.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { PasswordInput } from "./password-input";
import type { TextInput } from "./text-input";

interface Credentials {
  email: string;
  password: string;
}

describe("a form whose fields belong to no resource", () => {
  it("TextInput and PasswordInput take a source of the form's own values", () => {
    type TextProps = Parameters<typeof TextInput<Credentials>>[0];
    type PasswordProps = Parameters<typeof PasswordInput<Credentials>>[0];
    expectTypeOf<TextProps["source"]>().toEqualTypeOf<
      SourceProp<Credentials>
    >();
    expectTypeOf<PasswordProps["source"]>().toEqualTypeOf<
      SourceProp<Credentials>
    >();
    expectTypeOf<"email">().toExtend<TextProps["source"]>();
    expectTypeOf<"nope">().not.toExtend<TextProps["source"]>();
  });
});
