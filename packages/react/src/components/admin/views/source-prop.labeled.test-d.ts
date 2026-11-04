/**
 * `<Labeled>` and the webhook-endpoint and add-on fields name a path into a
 * record. The four that take a `record` narrow `source` to that record's
 * paths; `<Labeled>` holds no record type, so its `source` is `SourceProp`,
 * which is `string` until an app registers resources.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { GeoJsonFieldProps } from "../../maps/geo-json-field";
import type { MdxFieldProps } from "../../mdx-editor/mdx-field";
import type { MonacoJsonFieldProps } from "../../monaco/monaco-json-field";
import type { WebhookEndpointFieldProps } from "../fields/webhook-endpoint-field";
import type { LabeledProps } from "./labeled";

type Hook = {
  id: number;
  title: string;
  endpoint: { url: string };
};

describe("Labeled and add-on field sources", () => {
  it("each React component above accepts a path of its record and rejects a typo", () => {
    const webhook: WebhookEndpointFieldProps<Hook> = {
      source: "endpoint",
      record: { id: 1, title: "a", endpoint: { url: "u" } },
    };
    const monaco: MonacoJsonFieldProps<Hook> = { source: "endpoint.url" };
    const mdx: MdxFieldProps<Hook> = { source: "title" };
    const geo: GeoJsonFieldProps<Hook> = { source: "endpoint" };
    const unused = [webhook, monaco, mdx, geo];
    expectTypeOf(unused).not.toBeAny();

    // @ts-expect-error "titel" is no path of Hook
    const webhookTypo: WebhookEndpointFieldProps<Hook> = { source: "titel" };
    // @ts-expect-error "titel" is no path of Hook
    const monacoTypo: MonacoJsonFieldProps<Hook> = { source: "titel" };
    // @ts-expect-error "titel" is no path of Hook
    const mdxTypo: MdxFieldProps<Hook> = { source: "titel" };
    // @ts-expect-error "titel" is no path of Hook
    const geoTypo: GeoJsonFieldProps<Hook> = { source: "titel" };
    expectTypeOf([webhookTypo, monacoTypo, mdxTypo, geoTypo]).not.toBeAny();
  });

  it("the Labeled source is SourceProp", () => {
    expectTypeOf<LabeledProps["source"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
  });
});
