/**
 * The api-key, datagrid, webhook-endpoint, mdx and monaco-json inputs name a
 * path into the record, so with an explicit `record` type a path of it
 * compiles and a typo does not.
 */

import {
  defineResources,
  type RecordOf,
  type SourceValue,
} from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { createResourceComponentsOf } from "../../../resource/create-resource-components";
import type { MdxInputProps } from "../../mdx-editor/mdx-input";
import type { MonacoJsonInputProps } from "../../monaco/monaco-json-input";
import type { ApiKeyInputProps } from "./api-key-input";
import type { ColorInputProps } from "./color-input";
import type { CronInputProps } from "./cron-input";
import type { DatagridInputProps } from "./datagrid-input";
import type { TextArrayInputProps } from "./text-array-input";
import type { TextInputProps } from "./text-input";
import type { WebhookEndpointInputProps } from "./webhook-endpoint-input";

// A type alias: an interface has no index signature, so it does not satisfy
// the record constraint.
type Post = {
  id: number;
  apiKey: string;
  tag_ids: number[];
  settings: { theme: string };
};

describe("api-key, datagrid, webhook-endpoint, mdx and monaco-json sources", () => {
  it("each React component above accepts a path of its record and rejects a typo", () => {
    const apiKey: ApiKeyInputProps<Post> = { source: "apiKey" };
    const apiKeyTypo: ApiKeyInputProps<Post> = {
      // @ts-expect-error `apikey` is not a key of Post
      source: "apikey",
    };

    const datagrid: DatagridInputProps<Post> = { source: "tag_ids" };
    const datagridTypo: DatagridInputProps<Post> = {
      // @ts-expect-error `tag_id` is not a key of Post
      source: "tag_id",
    };

    const webhook: WebhookEndpointInputProps<Post> = {
      source: "settings",
      eventTypes: [],
    };
    const webhookTypo: WebhookEndpointInputProps<Post> = {
      // @ts-expect-error `setting` is not a key of Post
      source: "setting",
      eventTypes: [],
    };

    const mdx: MdxInputProps<Post> = { source: "apiKey" };
    const mdxTypo: MdxInputProps<Post> = {
      // @ts-expect-error `apikey` is not a key of Post
      source: "apikey",
    };

    const monaco: MonacoJsonInputProps<Post> = { source: "settings" };
    const monacoTypo: MonacoJsonInputProps<Post> = {
      // @ts-expect-error `setting` is not a key of Post
      source: "setting",
    };

    void [
      apiKey,
      apiKeyTypo,
      datagrid,
      datagridTypo,
      webhook,
      webhookTypo,
      mdx,
      mdxTypo,
      monaco,
      monacoTypo,
    ];
  });
});

const resources = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      views: z.number(),
      tags: z.array(z.string()),
      color: z.string(),
    }),
  },
});

type RegisteredPost = RecordOf<typeof resources, "posts">;

const posts = createResourceComponentsOf<typeof resources, "posts">("posts");

declare function acceptText(props: TextInputProps<Post, "apiKey">): void;
declare function acceptTextOf(props: TextInputProps<Post>): void;
declare function acceptColor(props: ColorInputProps<Post, "apiKey">): void;
declare function acceptColorOf(props: ColorInputProps<Post>): void;
declare function acceptCron(props: CronInputProps<Post, "apiKey">): void;
declare function acceptCronOf(props: CronInputProps<Post>): void;
declare function acceptTags(
  props: TextArrayInputProps<RegisteredPost, "tags">,
): void;
declare function acceptTagsOf(props: TextArrayInputProps<RegisteredPost>): void;

describe("the text-valued inputs of a record", () => {
  it("each props type takes a path of its record and a default of that path's type", () => {
    acceptText({ source: "apiKey", defaultValue: "k" });
    acceptColor({ source: "apiKey", defaultValue: "#fff" });
    acceptCron({ source: "apiKey", defaultValue: "* * * * *" });
    acceptTags({ source: "tags", defaultValue: ["a"] });
  });

  it("each props type rejects a typo and a default of another type", () => {
    // @ts-expect-error `apikey` is not a key of Post
    acceptTextOf({ source: "apikey" });
    // @ts-expect-error `apiKey` holds a string
    acceptText({ source: "apiKey", defaultValue: 1 });
    // @ts-expect-error `apikey` is not a key of Post
    acceptColorOf({ source: "apikey" });
    // @ts-expect-error `apikey` is not a key of Post
    acceptCronOf({ source: "apikey" });
    // @ts-expect-error `tag` is not a key of a post
    acceptTagsOf({ source: "tag" });
  });

  it("posts.TextInput takes defaultValue typed by its source", () => {
    const title = posts.TextInput<"title">;
    type Props = Parameters<typeof title>[0];
    expectTypeOf<Props["defaultValue"]>().toEqualTypeOf<
      SourceValue<RegisteredPost, "title"> | undefined
    >();
    posts.TextInput({ source: "title", defaultValue: "Untitled" });
    // @ts-expect-error `title` is a string, not a number
    posts.TextInput({ source: "title", defaultValue: 1 });
  });

  it("posts.TextInput rejects a misspelled source", () => {
    // @ts-expect-error `titel` is no path of a post
    posts.TextInput({ source: "titel" });
  });

  it("the other text-valued inputs type defaultValue by their source", () => {
    posts.ColorInput({ source: "color", defaultValue: "#fff" });
    posts.TextArrayInput({ source: "tags", defaultValue: ["a"] });
    // @ts-expect-error `tags` holds strings
    posts.TextArrayInput({ source: "tags", defaultValue: [1] });
    // @ts-expect-error `views` is a number, not a string
    posts.CronInput({ source: "views", defaultValue: "* * * * *" });
  });
});
