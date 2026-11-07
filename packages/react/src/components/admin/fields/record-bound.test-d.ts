/**
 * Type tests for the record bound of the array, badge, boolean, chip, color and
 * cron fields: an `interface` has no index signature, so a `LooseRecord` bound
 * refuses it. Each field's props take it as the record.
 */

import { describe, expectTypeOf, it } from "vitest";
import type { ArrayFieldProps } from "./array-field";
import type { BadgeFieldProps } from "./badge-field";
import type { BooleanFieldProps } from "./boolean-field";
import type { ChipFieldProps } from "./chip-field";
import type { ColorFieldProps } from "./color-field";
import type { CronFieldProps } from "./cron-field";

interface Post {
  id: number;
  tags: { id: number; name: string }[];
  status: string;
  published: boolean;
  color: string;
  schedule: string;
}

describe("fields bounded by ResourceRecord", () => {
  it("take an interface as their record", () => {
    expectTypeOf<ArrayFieldProps<Post>>().not.toBeNever();
    expectTypeOf<BadgeFieldProps<Post>>().not.toBeNever();
    expectTypeOf<BooleanFieldProps<Post>>().not.toBeNever();
    expectTypeOf<ChipFieldProps<Post>>().not.toBeNever();
    expectTypeOf<ColorFieldProps<Post>>().not.toBeNever();
    expectTypeOf<CronFieldProps<Post>>().not.toBeNever();
  });

  it("check source against the interface's keys", () => {
    const badge: BadgeFieldProps<Post> = { source: "status" };
    // @ts-expect-error "missing" is not a key of Post
    const wrong: BadgeFieldProps<Post> = { source: "missing" };
    expectTypeOf(badge.source).toEqualTypeOf<BadgeFieldProps<Post>["source"]>();
    expectTypeOf(wrong).toMatchTypeOf<BadgeFieldProps<Post>>();
  });
});
