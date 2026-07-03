/**
 * P7a-T2 type tests: the label/representation helper return signatures match
 * their ra-core contracts (adapted to chelone types).
 */

import type { ReactNode } from "react";
import { describe, expectTypeOf, it } from "vitest";
import type { GetRecordRepresentation } from "./use-get-record-representation";
import { useGetRecordRepresentation } from "./use-get-record-representation";
import type { GetResourceLabel } from "./use-get-resource-label";
import { useGetResourceLabel } from "./use-get-resource-label";
import type { UseResourceTranslationOptions } from "./use-resource-translation";
import { useResourceTranslation } from "./use-resource-translation";
import type { TranslateLabel } from "./use-translate-label";
import { useTranslateLabel } from "./use-translate-label";

describe("label helper types", () => {
  it("useGetRecordRepresentation returns (record) => ReactNode", () => {
    expectTypeOf(
      useGetRecordRepresentation,
    ).returns.toEqualTypeOf<GetRecordRepresentation>();
    expectTypeOf<GetRecordRepresentation>()
      .parameter(0)
      .toEqualTypeOf<unknown>();
    expectTypeOf<
      ReturnType<GetRecordRepresentation>
    >().toEqualTypeOf<ReactNode>();
  });

  it("useGetResourceLabel returns (resource, count?) => string", () => {
    expectTypeOf(useGetResourceLabel).returns.toEqualTypeOf<GetResourceLabel>();
    expectTypeOf<ReturnType<GetResourceLabel>>().toEqualTypeOf<string>();
  });

  it("useTranslateLabel returns ({source,label?,resource?}) => ReactNode", () => {
    expectTypeOf(useTranslateLabel).returns.toEqualTypeOf<TranslateLabel>();
    expectTypeOf<ReturnType<TranslateLabel>>().toEqualTypeOf<ReactNode>();
  });

  it("useResourceTranslation accepts the options shape and returns ReactNode", () => {
    expectTypeOf(useResourceTranslation)
      .parameter(0)
      .toEqualTypeOf<UseResourceTranslationOptions>();
    expectTypeOf(useResourceTranslation).returns.toEqualTypeOf<ReactNode>();
  });
});
