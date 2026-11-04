import { expectTypeOf, it } from "vitest";
import {
  choices,
  composeValidators,
  type EmptyValue,
  type FieldValidatorMeta,
  isRequired,
  type MessageFactory,
  minLength,
  number,
  type RequiredValidator,
  required,
  type ValidationMessage,
  type ValidationMessageParams,
  type Validator,
  type ValidatorResult,
} from "./validators";

interface Post {
  id: number;
  title: string;
}

it("required() assigns to a validator for a typed field", () => {
  const validator: Validator<string, Post> = required();
  void validator;
  expectTypeOf(required()).toMatchTypeOf<Validator<string, Post>>();
  expectTypeOf(required().isRequired).toEqualTypeOf<true>();
  expectTypeOf(required()).toEqualTypeOf<RequiredValidator>();
});

it("Validator is generic in the value and the values", () => {
  expectTypeOf<Validator>().parameter(0).toBeUnknown();
  expectTypeOf<Validator<string, Post>>()
    .parameter(0)
    .toEqualTypeOf<string | EmptyValue>();
  expectTypeOf<Validator<string, Post>>().parameter(1).toEqualTypeOf<Post>();
  const typed: Validator<string, Post> = (value, values) =>
    values.title === value ? undefined : "chelone.validation.title";
  void typed;
});

it("a validator written for one value type is not a validator for another", () => {
  const forString: Validator<string> = () => undefined;
  // @ts-expect-error a string field's validator is not a number field's validator
  const forNumber: Validator<number> = forString;
  void forNumber;
});

it("Validator's third parameter is FieldValidatorMeta", () => {
  expectTypeOf<Parameters<Validator>[2]>().toEqualTypeOf<
    FieldValidatorMeta | undefined
  >();
  const readsMeta: Validator<string, Post> = (value, values, meta) => {
    expectTypeOf(value).toEqualTypeOf<string | EmptyValue>();
    expectTypeOf(values).toEqualTypeOf<Post>();
    expectTypeOf(meta).toEqualTypeOf<FieldValidatorMeta | undefined>();
    expectTypeOf(meta?.source).toEqualTypeOf<string | undefined>();
    return undefined;
  };
  void readsMeta;
});

it("FieldValidatorMeta carries the final source path", () => {
  expectTypeOf<FieldValidatorMeta>()
    .pick<"source">()
    .toEqualTypeOf<{ source?: string }>();
});

it("composeValidators keeps the value pair it is given", () => {
  expectTypeOf(
    composeValidators(required(), minLength(3)),
  ).toEqualTypeOf<Validator>();
  const typed = composeValidators<string, Post>(required(), minLength(3));
  expectTypeOf(typed).toEqualTypeOf<Validator<string, Post>>();
  expectTypeOf(isRequired([required(), minLength(3)])).toEqualTypeOf<boolean>();
});

it("choices is generic in the value it checks", () => {
  expectTypeOf(choices(["m", "f"])).toEqualTypeOf<Validator<string>>();
  expectTypeOf(choices([{ id: 1, name: "m" }])).toEqualTypeOf<
    Validator<number>
  >();
  const forNumber: Validator<number> = choices([{ id: 1, name: "m" }]);
  void forNumber;
});

it("a message factory sees the typed params", () => {
  const factory: MessageFactory<string, Post> = ({ args, value, values }) => {
    expectTypeOf(value).toEqualTypeOf<string | EmptyValue>();
    expectTypeOf(values).toEqualTypeOf<Post>();
    // type-escape: interpolation args are an app-supplied bag of any values.
    expectTypeOf(args).toEqualTypeOf<Record<string, unknown> | undefined>();
    return "chelone.validation.custom";
  };
  const message: ValidationMessage<string, Post> = factory;
  expectTypeOf<ValidationMessageParams<string, Post>>().toEqualTypeOf<{
    // type-escape: the same app-supplied bag of any values.
    args: Record<string, unknown> | undefined;
    value: string | EmptyValue;
    values: Post;
  }>();
  const validator: Validator<string, Post> = required(message);
  void validator;
  void factory;
});

it("a built-in's verdict is the validator result union", () => {
  expectTypeOf(number()).toEqualTypeOf<Validator>();
  expectTypeOf(number()("x", {}, { source: "x" })).toEqualTypeOf<
    ValidatorResult | Promise<ValidatorResult>
  >();
});
