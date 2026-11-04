/**
 * `<Labeled>` and the webhook-endpoint and add-on fields name a path into a
 * record, so each takes `SourceProp`. Their `source` stays `string` until an
 * app registers its resources.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { GeoJsonFieldProps } from "../../maps/geo-json-field.vue";
import type { MdxFieldProps } from "../../mdx-editor/mdx-field.vue";
import type { MonacoJsonFieldProps } from "../../monaco/monaco-json-field.vue";
import type { WebhookEndpointFieldProps } from "../fields/webhook-endpoint-field.vue";
import type { LabeledProps } from "./labeled.vue";

describe("Labeled and add-on field sources", () => {
  it("the Labeled source prop is SourceProp", () => {
    expectTypeOf<LabeledProps["source"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
  });

  it("the WebhookEndpointField source prop is SourceProp", () => {
    expectTypeOf<
      WebhookEndpointFieldProps["source"]
    >().toEqualTypeOf<SourceProp>();
  });

  it("the MonacoJsonField source prop is SourceProp", () => {
    expectTypeOf<MonacoJsonFieldProps["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the MdxField source prop is SourceProp", () => {
    expectTypeOf<MdxFieldProps["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the GeoJsonField source prop is SourceProp", () => {
    expectTypeOf<GeoJsonFieldProps["source"]>().toEqualTypeOf<SourceProp>();
  });
});
