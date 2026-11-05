/**
 * Every slot of the auth, button, feedback and guesser components returns
 * `VNode[]`, so a caller that renders a slot reads a typed result.
 */

import { describe, expectTypeOf, it } from "vitest";
import type { VNode } from "vue";
import type AccessDenied from "./auth/access-denied.vue";
import type AuthLayout from "./auth/auth-layout.vue";
import type CanAccess from "./auth/can-access.vue";
import type LoginPage from "./auth/login-page.vue";
import type LocalesMenuButton from "./buttons/locales-menu-button.vue";
import type NotFound from "./feedback/not-found.vue";
import type GuesserEmpty from "./guessers/guesser-empty.vue";

type Slots<T extends abstract new (...args: never[]) => object> = NonNullable<
  InstanceType<T>["$slots"]
>;

describe("slot returns", () => {
  it("AccessDenied#icon", () => {
    expectTypeOf<
      ReturnType<NonNullable<Slots<typeof AccessDenied>["icon"]>>
    >().toEqualTypeOf<VNode[]>();
  });

  it("AuthLayout#default, #aside and #notification", () => {
    type S = Slots<typeof AuthLayout>;
    expectTypeOf<ReturnType<NonNullable<S["default"]>>>().toEqualTypeOf<
      VNode[]
    >();
    expectTypeOf<ReturnType<NonNullable<S["aside"]>>>().toEqualTypeOf<
      VNode[]
    >();
    expectTypeOf<ReturnType<NonNullable<S["notification"]>>>().toEqualTypeOf<
      VNode[]
    >();
  });

  it("CanAccess#default, #loading and #accessDenied", () => {
    type S = Slots<typeof CanAccess>;
    expectTypeOf<ReturnType<NonNullable<S["default"]>>>().toEqualTypeOf<
      VNode[]
    >();
    expectTypeOf<ReturnType<NonNullable<S["loading"]>>>().toEqualTypeOf<
      VNode[]
    >();
    expectTypeOf<ReturnType<NonNullable<S["accessDenied"]>>>().toEqualTypeOf<
      VNode[]
    >();
  });

  it("LoginPage#default", () => {
    expectTypeOf<
      ReturnType<NonNullable<Slots<typeof LoginPage>["default"]>>
    >().toEqualTypeOf<VNode[]>();
  });

  it("LocalesMenuButton#icon", () => {
    expectTypeOf<
      ReturnType<NonNullable<Slots<typeof LocalesMenuButton>["icon"]>>
    >().toEqualTypeOf<VNode[]>();
  });

  it("NotFound#icon", () => {
    expectTypeOf<
      ReturnType<NonNullable<Slots<typeof NotFound>["icon"]>>
    >().toEqualTypeOf<VNode[]>();
  });

  it("GuesserEmpty#title and #message", () => {
    type S = Slots<typeof GuesserEmpty>;
    expectTypeOf<ReturnType<NonNullable<S["title"]>>>().toEqualTypeOf<
      VNode[]
    >();
    expectTypeOf<ReturnType<NonNullable<S["message"]>>>().toEqualTypeOf<
      VNode[]
    >();
  });
});
