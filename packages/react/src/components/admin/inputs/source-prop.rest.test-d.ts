/**
 * The api-key, datagrid, webhook-endpoint, mdx and monaco-json inputs name a
 * path into the record, so with an explicit `record` type a path of it
 * compiles and a typo does not.
 */

import { describe, it } from "vitest";
import type { MdxInputProps } from "../../mdx-editor/mdx-input";
import type { MonacoJsonInputProps } from "../../monaco/monaco-json-input";
import type { ApiKeyInputProps } from "./api-key-input";
import type { DatagridInputProps } from "./datagrid-input";
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
