import { describe, expectTypeOf, it } from "vitest";
import type { AnyCheloneI18n } from "./i18n";
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

declare const i18n: AnyCheloneI18n;

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

  it("a placeholder-free plural needs exactly a numeric count", () => {
    const plain = defineMessages({
      "chelone.items": { one: "one item", other: "many items" },
    });
    expectTypeOf<
      TranslateParams<(typeof plain)["chelone.items"]>
    >().toEqualTypeOf<{ count: number }>();
  });

  it("the catalog-erased translate takes string or number values only", () => {
    i18n.translate("key", { name: "x", count: 1 });
    // @ts-expect-error a boolean is not a message param
    i18n.translate("key", { flag: true });
  });
});
