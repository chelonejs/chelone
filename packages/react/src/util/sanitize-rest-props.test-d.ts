import { describe, expectTypeOf, it } from "vitest";
import { sanitizeFieldRestProps } from "./sanitize-field-rest-props";
import { sanitizeInputRestProps } from "./sanitize-input-rest-props";

type FieldProps = {
  source: string;
  label: string;
  title: string;
  tabIndex: number;
};

type InputProps = {
  source: string;
  validate: () => undefined;
  placeholder: string;
  maxLength: number;
};

describe("sanitizeFieldRestProps", () => {
  it("sanitizeFieldRestProps keeps unstripped props", () => {
    const props: FieldProps = {
      source: "title",
      label: "Title",
      title: "hi",
      tabIndex: 1,
    };
    const rest = sanitizeFieldRestProps(props);
    expectTypeOf(rest.title).toBeString();
    expectTypeOf(rest.tabIndex).toBeNumber();
  });

  it("drops the stripped ones", () => {
    const props: FieldProps = {
      source: "title",
      label: "Title",
      title: "hi",
      tabIndex: 1,
    };
    const rest = sanitizeFieldRestProps(props);
    // @ts-expect-error source is stripped
    rest.source;
    // @ts-expect-error label is stripped
    rest.label;
  });
});

describe("sanitizeInputRestProps", () => {
  it("sanitizeInputRestProps keeps unstripped props", () => {
    const props: InputProps = {
      source: "title",
      validate: () => undefined,
      placeholder: "p",
      maxLength: 3,
    };
    const rest = sanitizeInputRestProps(props);
    expectTypeOf(rest.placeholder).toBeString();
    expectTypeOf(rest.maxLength).toBeNumber();
  });

  it("drops the stripped ones", () => {
    const props: InputProps = {
      source: "title",
      validate: () => undefined,
      placeholder: "p",
      maxLength: 3,
    };
    const rest = sanitizeInputRestProps(props);
    // @ts-expect-error source is stripped
    rest.source;
    // @ts-expect-error validate is stripped
    rest.validate;
  });
});
