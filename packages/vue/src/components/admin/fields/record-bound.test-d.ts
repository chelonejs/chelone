/**
 * Type tests for the record bound of the array, badge, boolean, chip, color and
 * cron fields: an `interface` has no index signature, so a `LooseRecord` bound
 * refuses it. Each field's props name a key of the interface as `source`.
 */

import { describe, it } from "vitest";
import type { ArrayFieldProps } from "./array-field.vue";
import type { BadgeFieldProps } from "./badge-field.vue";
import type { BooleanFieldProps } from "./boolean-field.vue";
import type { ChipFieldProps } from "./chip-field.vue";
import type { ColorFieldProps } from "./color-field.vue";
import type { CronFieldProps } from "./cron-field.vue";

interface Job {
  id: number;
  steps: { id: number; label: string }[];
  state: string;
  enabled: boolean;
  accent: string;
  cadence: string;
}

describe("vue fields bounded by ResourceRecord", () => {
  it("accept a key of an interface record as source", () => {
    const props = [
      { source: "steps" } satisfies ArrayFieldProps<Job>,
      { source: "state" } satisfies BadgeFieldProps<Job>,
      { source: "enabled" } satisfies BooleanFieldProps<Job>,
      { source: "state" } satisfies ChipFieldProps<Job>,
      { source: "accent" } satisfies ColorFieldProps<Job>,
      { source: "cadence" } satisfies CronFieldProps<Job>,
    ];
    props.length;
  });

  it("refuse a key the interface lacks", () => {
    // @ts-expect-error "missing" is not a key of Job
    const wrong = { source: "missing" } satisfies CronFieldProps<Job>;
    wrong.source;
  });
});
