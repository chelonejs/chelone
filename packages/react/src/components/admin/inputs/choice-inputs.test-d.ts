/**
 * The choice inputs keep `TChoice` from their props through their body, so the
 * `optionText` formatter receives the inferred choice and `optionValue` is
 * checked against the paths of the inline choices.
 */

import type { ChoiceValueOf, SourceValue } from "@chelone/core";
import { defineResources } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { createResourceComponentsOf } from "../../../resource/create-resource-components";
import { AutocompleteArrayInput } from "./autocomplete-array-input";
import { AutocompleteInput } from "./autocomplete-input";
import { CheckboxGroupInput } from "./checkbox-group-input";
import { SelectArrayInput } from "./select-array-input";
import { SelectInput } from "./select-input";

type Author = { id: number; name: string; address: { city: string } };

const choices: Author[] = [{ id: 1, name: "Ada", address: { city: "London" } }];

describe("choice inputs keep TChoice", () => {
  it("SelectInput optionText formatter receives the inferred choice", () => {
    SelectInput({
      source: "author",
      choices,
      optionText: (choice) => {
        expectTypeOf(choice).toEqualTypeOf<Author>();
        return choice.address.city;
      },
    });
  });

  it("AutocompleteInput optionText formatter receives the inferred choice", () => {
    AutocompleteInput({
      source: "author",
      choices,
      optionText: (choice) => {
        expectTypeOf(choice).toEqualTypeOf<Author>();
        return choice.address.city;
      },
    });
  });

  it("CheckboxGroupInput optionText formatter receives the inferred choice", () => {
    CheckboxGroupInput({
      source: "authors",
      choices,
      optionText: (choice) => {
        expectTypeOf(choice).toEqualTypeOf<Author>();
        return choice.address.city;
      },
    });
  });

  it("optionValue rejects a path the choices lack", () => {
    SelectInput({
      source: "author",
      choices,
      // @ts-expect-error `ide` is not a path of Author
      optionValue: "ide",
    });
    AutocompleteInput({
      source: "author",
      choices,
      // @ts-expect-error `ide` is not a path of Author
      optionValue: "ide",
    });
    CheckboxGroupInput({
      source: "authors",
      choices,
      // @ts-expect-error `ide` is not a path of Author
      optionValue: "ide",
    });
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

type CheckboxGroupAtTagIds = typeof posts.CheckboxGroupInput<"tagIds", Author>;

describe("choice inputs keep the record, the source and the choice", () => {
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

  it("posts.SelectArrayInput and posts.AutocompleteArrayInput type defaultValue the same way", () => {
    posts.SelectArrayInput({ source: "tagIds", choices, defaultValue: [1] });
    posts.AutocompleteArrayInput({
      source: "tagIds",
      choices,
      defaultValue: [1],
    });
    posts.SelectArrayInput({
      source: "tagIds",
      choices,
      // @ts-expect-error `tagIds` holds numbers, not strings
      defaultValue: "a",
    });
    posts.AutocompleteInput({ source: "authorId", choices, defaultValue: 1 });
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

  it("isOptionEqualToValue receives the ChoiceValueOf the choices", () => {
    posts.AutocompleteInput({
      source: "authorId",
      choices,
      isOptionEqualToValue: (option, value) => {
        expectTypeOf(option).toEqualTypeOf<ChoiceValueOf<Author>>();
        expectTypeOf(value).toEqualTypeOf<ChoiceValueOf<Author>>();
        return option === value;
      },
    });
    AutocompleteArrayInput({
      source: "tagIds",
      choices,
      isOptionEqualToValue: (option, value) => {
        expectTypeOf(option).toEqualTypeOf<number>();
        return option === value;
      },
    });
  });

  it("inputText and matchSuggestion take the choice", () => {
    AutocompleteInput({
      source: "authorId",
      choices,
      inputText: (choice) => {
        expectTypeOf(choice).toEqualTypeOf<Author>();
        return choice.name;
      },
      matchSuggestion: (_filter, choice) => {
        expectTypeOf(choice).toEqualTypeOf<Author>();
        return true;
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

  it("direct use takes any source", () => {
    SelectArrayInput({ source: "anything", choices });
  });
});
