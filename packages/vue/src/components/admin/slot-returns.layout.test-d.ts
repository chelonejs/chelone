/**
 * Every slot of the layout, realtime, supabase and mdx components returns
 * `VNode[]`, so a caller that renders a slot reads a typed result.
 */

import type { Lock } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { VNode } from "vue";
import type MdxField from "../mdx-editor/mdx-field.vue";
import type CommandMenu from "./layout/command-menu.vue";
import type Menu from "./layout/menu.vue";
import type Title from "./layout/title.vue";
import type LockOnMount from "./realtime/lock-on-mount.vue";
import type LockStatus from "./realtime/lock-status.vue";
import type ForgotPasswordPage from "./supabase/forgot-password-page.vue";
import type SetPasswordPage from "./supabase/set-password-page.vue";
import type SupabaseLoginPage from "./supabase/supabase-login-page.vue";

type Slots<T extends abstract new (...args: never[]) => object> = NonNullable<
  InstanceType<T>["$slots"]
>;

type Plain = (() => VNode[]) | undefined;
type WithLock = ((props: { lock: Lock }) => VNode[]) | undefined;

describe("slot returns", () => {
  it("CommandMenu#default", () => {
    expectTypeOf<Slots<typeof CommandMenu>["default"]>().toEqualTypeOf<Plain>();
  });

  it("Menu#default", () => {
    expectTypeOf<Slots<typeof Menu>["default"]>().toEqualTypeOf<Plain>();
  });

  it("Title#default", () => {
    expectTypeOf<Slots<typeof Title>["default"]>().toEqualTypeOf<Plain>();
  });

  it("LockOnMount#default, #loading and #locked-by", () => {
    type S = Slots<typeof LockOnMount>;
    expectTypeOf<S["default"]>().toEqualTypeOf<Plain>();
    expectTypeOf<S["loading"]>().toEqualTypeOf<Plain>();
    expectTypeOf<S["locked-by"]>().toEqualTypeOf<WithLock>();
  });

  it("LockStatus#lock and #free", () => {
    type S = Slots<typeof LockStatus>;
    expectTypeOf<S["lock"]>().toEqualTypeOf<WithLock>();
    expectTypeOf<S["free"]>().toEqualTypeOf<Plain>();
  });

  it("ForgotPasswordPage#default", () => {
    expectTypeOf<
      Slots<typeof ForgotPasswordPage>["default"]
    >().toEqualTypeOf<Plain>();
  });

  it("SetPasswordPage#default", () => {
    expectTypeOf<
      Slots<typeof SetPasswordPage>["default"]
    >().toEqualTypeOf<Plain>();
  });

  it("SupabaseLoginPage#default", () => {
    expectTypeOf<
      Slots<typeof SupabaseLoginPage>["default"]
    >().toEqualTypeOf<Plain>();
  });

  it("MdxField#empty", () => {
    // `MdxField` is generic in its record, so it is a generic function and has
    // no `InstanceType`: its slots come from the second call parameter.
    type S = NonNullable<Parameters<typeof MdxField>[1]>["slots"];
    expectTypeOf<S["empty"]>().toEqualTypeOf<Plain>();
  });
});
