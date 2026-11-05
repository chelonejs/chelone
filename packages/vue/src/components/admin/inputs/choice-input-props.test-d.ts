import type {
  ChoiceValueOf,
  LooseRecord,
  SourceProp,
  SourceValue,
} from "@chelone/core";
import { defineResources } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { createResourceComponentsOf } from "../../../create-resource-components";
import type { ChoiceInputBaseProps } from "./choice-input-props";
import {
  type UseChoiceInputOptions,
  type UseChoiceInputResult,
  useChoiceInput,
} from "./use-choice-input";

// A `type`, not an `interface`: only a type alias satisfies `ChoiceRecord`.
type Author = { id: number; name: string; address: { city: string } };

describe("ChoiceInputBaseProps", () => {
  it("ChoiceInputBaseProps source is SourceProp or undefined", () => {
    expectTypeOf<ChoiceInputBaseProps["source"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<UseChoiceInputOptions["source"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
  });

  it("ChoiceInputBaseProps<Author> takes the paths of Author", () => {
    expectTypeOf<
      ChoiceInputBaseProps<LooseRecord, string, Author>["optionValue"]
    >().toEqualTypeOf<"id" | "name" | "address" | "address.city" | undefined>();
    expectTypeOf<
      ChoiceInputBaseProps<LooseRecord, string, Author>["choices"]
    >().toEqualTypeOf<readonly (string | Author)[] | undefined>();
    const props: ChoiceInputBaseProps<LooseRecord, string, Author> = {
      // @ts-expect-error `nme` is not a path of Author
      optionText: "nme",
    };
    void props;
  });

  it("useChoiceInput<Author> checks the paths and gives accessors that take an Author", () => {
    const input = useChoiceInput<Author>({
      componentName: "Test",
      optionText: "address.city",
      optionValue: "id",
      disableValue: "name",
    });
    expectTypeOf(input).toEqualTypeOf<UseChoiceInputResult<Author>>();
    expectTypeOf(input.getChoiceText).parameter(0).toEqualTypeOf<Author>();
    expectTypeOf(input.getChoiceValue).returns.toEqualTypeOf<
      ChoiceValueOf<Author>
    >();
    expectTypeOf(input.getChoiceValue).returns.toEqualTypeOf<number>();
    // @ts-expect-error `nme` is not a path of Author
    useChoiceInput<Author>({ componentName: "Test", optionText: "nme" });
  });

  it("useChoiceInput without a type argument takes any string", () => {
    useChoiceInput({ componentName: "Test", optionValue: "anyKey" });
  });
});

const postSchema = z.object({
  title: z.string(),
  authorId: z.number(),
  tagIds: z.array(z.number()),
});

const resources = defineResources({ posts: { schema: postSchema } });
type Post = z.output<typeof postSchema>;

const posts = createResourceComponentsOf<typeof resources, "posts">("posts");

const choices: Author[] = [{ id: 1, name: "Ada", address: { city: "London" } }];

type CheckboxGroupAtTagIds = typeof posts.CheckboxGroupInput<"tagIds", Author>;

describe("choice inputs keep the record, the source and the choice", () => {
  it("ChoiceInputBaseProps types defaultValue as the value at its source", () => {
    expectTypeOf<
      ChoiceInputBaseProps<Post, "tagIds">["defaultValue"]
    >().toEqualTypeOf<SourceValue<Post, "tagIds"> | undefined>();
  });

  it("posts.CheckboxGroupInput types defaultValue as the value at its source", () => {
    expectTypeOf<
      Parameters<CheckboxGroupAtTagIds>[0]["defaultValue"]
    >().toEqualTypeOf<SourceValue<Post, "tagIds"> | undefined>();
    posts.CheckboxGroupInput({
      source: "tagIds",
      choices,
      defaultValue: [1, 2],
    });
    posts.CheckboxGroupInput({
      source: "tagIds",
      choices,
      // @ts-expect-error `tagIds` holds numbers, not strings
      defaultValue: ["a"],
    });
  });

  it("posts.SelectArrayInput, AutocompleteArrayInput and AutocompleteInput type defaultValue the same way", () => {
    posts.SelectArrayInput({ source: "tagIds", choices, defaultValue: [1] });
    posts.AutocompleteArrayInput({
      source: "tagIds",
      choices,
      defaultValue: [1],
    });
    posts.AutocompleteInput({ source: "authorId", choices, defaultValue: 1 });
    posts.SelectArrayInput({
      source: "tagIds",
      choices,
      // @ts-expect-error `tagIds` holds numbers, not strings
      defaultValue: "a",
    });
    posts.AutocompleteInput({
      source: "authorId",
      choices,
      // @ts-expect-error `authorId` is a number
      defaultValue: "1",
    });
  });

  it("a resource member still infers the choice for optionText", () => {
    posts.CheckboxGroupInput({
      source: "tagIds",
      choices,
      optionText: (choice) => {
        expectTypeOf(choice).toEqualTypeOf<Author>();
        return choice.address.city;
      },
    });
  });

  it("rejects a source the record lacks", () => {
    // @ts-expect-error `tagz` is no path of a post
    posts.CheckboxGroupInput({ source: "tagz", choices });
    // @ts-expect-error `tagz` is no path of a post
    posts.SelectArrayInput({ source: "tagz", choices });
    // @ts-expect-error `tagz` is no path of a post
    posts.AutocompleteArrayInput({ source: "tagz", choices });
    // @ts-expect-error `authorz` is no path of a post
    posts.AutocompleteInput({ source: "authorz", choices });
  });
});
