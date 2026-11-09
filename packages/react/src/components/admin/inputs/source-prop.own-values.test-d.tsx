/**
 * A form whose fields belong to no resource types its inputs against its own
 * values, so a registered app does not have to find `email` in a resource.
 */

import { describe, it } from "vitest";
import { PasswordInput } from "./password-input";
import { TextInput } from "./text-input";

interface Credentials {
  email: string;
  password: string;
}

describe("a form whose fields belong to no resource", () => {
  it("TextInput and PasswordInput check source against the form's values", () => {
    <TextInput<Credentials> source="email" />;
    <PasswordInput<Credentials> source="password" />;
    // @ts-expect-error `nope` is no path of the credentials
    <TextInput<Credentials> source="nope" />;
    // @ts-expect-error `nope` is no path of the credentials
    <PasswordInput<Credentials> source="nope" />;
  });
});
