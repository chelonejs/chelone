import { describe, expectTypeOf, it } from "vitest";
import type { TranslateParamValues } from "../i18n/messages";
import type { LooseRecord } from "../resource/record";
import { createFormController } from "./form-controller";
import {
  type FormErrors,
  normalizeFormError,
  type TranslatableMessage,
  type ValidationErrorMessage,
} from "./form-errors";

interface Post {
  title: string;
  views: number;
  author: { name: string };
}

const save = async (): Promise<undefined> => undefined;

describe("normalizeFormError", () => {
  it("returns a message or nothing", () => {
    expectTypeOf(normalizeFormError(null)).toEqualTypeOf<
      ValidationErrorMessage | undefined
    >();
    expectTypeOf<ValidationErrorMessage>().toEqualTypeOf<
      string | TranslatableMessage
    >();
    expectTypeOf<TranslatableMessage>().toEqualTypeOf<{
      message: string;
      args?: TranslateParamValues;
    }>();
  });
});

describe("FormErrors", () => {
  it("is a ValidationErrorMessage per record path, plus root", () => {
    expectTypeOf<FormErrors<Post>["title"]>().toEqualTypeOf<
      ValidationErrorMessage | undefined
    >();
    expectTypeOf<FormErrors<Post>["author.name"]>().toEqualTypeOf<
      ValidationErrorMessage | undefined
    >();
    expectTypeOf<FormErrors<Post>["root"]>().toEqualTypeOf<
      ValidationErrorMessage | undefined
    >();
  });

  it("takes any string path for a record nobody typed", () => {
    expectTypeOf<FormErrors<LooseRecord>["anything"]>().toEqualTypeOf<
      ValidationErrorMessage | undefined
    >();
  });
});

describe("validate", () => {
  it("returns errors keyed by the record's paths", () => {
    createFormController<Post>({
      save,
      validate: (values) =>
        values.title
          ? undefined
          : {
              title: "chelone.validation.required",
              "author.name": {
                message: "chelone.validation.minLength",
                args: { min: 2 },
              },
              root: "Fix the errors",
            },
    });
    createFormController<Post>({
      save,
      validate: async () => ({ views: "Too many" }),
    });
  });

  it("refuses a misspelled path", () => {
    createFormController<Post>({
      save,
      // @ts-expect-error: `titel` is not a path of Post
      validate: () => ({ titel: "chelone.validation.required" }),
    });
  });

  it("refuses an error that is not a message", () => {
    createFormController<Post>({
      save,
      // @ts-expect-error: a number is not a ValidationErrorMessage
      validate: () => ({ title: 5 }),
    });
  });
});
