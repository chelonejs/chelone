import { describe, expectTypeOf, it } from "vitest";
import {
  defineMessages,
  type MessageKey,
  type TranslateParams,
} from "./messages";

const messages = defineMessages({
  "chelone.action.save": "Save",
  "chelone.greeting": "Hello {name}, you have {count} items",
  "chelone.notification.deleted": {
    one: "1 element deleted",
    other: "{smart_count} elements deleted",
  },
});
type M = typeof messages;

describe("i18n type machinery", () => {
  it("keys are a literal union", () => {
    expectTypeOf<MessageKey<M>>().toEqualTypeOf<
      | "chelone.action.save"
      | "chelone.greeting"
      | "chelone.notification.deleted"
    >();
  });

  it("plain message without placeholders needs no params", () => {
    expectTypeOf<
      TranslateParams<M["chelone.action.save"]>
    >().toEqualTypeOf<undefined>();
  });

  it("placeholders infer required param names", () => {
    expectTypeOf<TranslateParams<M["chelone.greeting"]>>().toEqualTypeOf<{
      name: string | number;
      count: string | number;
    }>();
  });

  it("plural message requires count plus the other-branch placeholders", () => {
    expectTypeOf<
      TranslateParams<M["chelone.notification.deleted"]>
    >().toEqualTypeOf<{ smart_count: string | number } & { count: number }>();
  });
});
