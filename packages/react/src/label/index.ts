/**
 * P7a-T2 label/representation/resource-translation compat layer for
 * `@chelone/react`: the ra-core i18n label helpers the shadmin component
 * surface consumes, reauthored over the chelone resource-definition registry +
 * i18n (`useTranslate`) and adapted to chelone's key-echo missing-message
 * convention (no polyglot `_`) and `count`-based pluralization.
 */

export type { GetRecordRepresentation } from "./use-get-record-representation";
export { useGetRecordRepresentation } from "./use-get-record-representation";
export type { GetResourceLabel } from "./use-get-resource-label";
export { useGetResourceLabel } from "./use-get-resource-label";
export type { UseResourceTranslationOptions } from "./use-resource-translation";
export { useResourceTranslation } from "./use-resource-translation";
export type {
  TranslateLabel,
  TranslateLabelOptions,
} from "./use-translate-label";
export { useTranslateLabel } from "./use-translate-label";
