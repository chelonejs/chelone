/**
 * The api-key, webhook-endpoint, mdx and monaco-json inputs name a path into
 * the record, so their `source` is `SourceProp`, not a plain `string`.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type MdxInput from "../../mdx-editor/mdx-input.vue";
import type MonacoJsonInput from "../../monaco/monaco-json-input.vue";
import type ApiKeyInput from "./api-key-input.vue";
import type WebhookEndpointInput from "./webhook-endpoint-input.vue";

describe("api-key, webhook-endpoint, mdx and monaco-json sources", () => {
  it("the ApiKeyInput source prop is SourceProp", () => {
    // A generic SFC is a function whose first parameter is its props.
    type Props = Parameters<typeof ApiKeyInput>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the WebhookEndpointInput source prop is SourceProp", () => {
    type Props = InstanceType<typeof WebhookEndpointInput>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the MdxInput source prop is SourceProp", () => {
    // A generic SFC is a function whose first parameter is its props.
    type Props = Parameters<typeof MdxInput>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the MonacoJsonInput source prop is SourceProp", () => {
    type Props = Parameters<typeof MonacoJsonInput>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });
});
