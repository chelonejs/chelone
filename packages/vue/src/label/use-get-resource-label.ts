/**
 * `useGetResourceLabel()` — returns `(resource, count?) => string`, the Vue twin
 * of `@chelone/react`'s `label/use-get-resource-label.ts` (ra-core parity).
 * Translates `resources.${resource}.name` with pluralization, falling back to a
 * humanized, count-inflected default when the key is missing (Chelone
 * `translate` echoes the key on a miss).
 *
 * Vue divergence from the React twin: the adapter's `ResourceDefinition` carries
 * no `options.label` bag (a later wave), so the fallback is purely the humanized
 * plural of the resource name — no per-resource label override yet.
 */

import { useTranslate } from "../i18n/use-translate";
import { humanize, pluralize } from "./inflection";

/** The label resolver `useGetResourceLabel` returns. */
export type GetResourceLabel = (resource: string, count?: number) => string;

export function useGetResourceLabel(): GetResourceLabel {
  const translate = useTranslate();

  return (resource: string, count = 2): string => {
    const humanizedDefault = humanize(pluralize(resource, count));
    const key = `resources.${resource}.name`;
    const translated = translate(key, { count, smart_count: count });
    return translated === key ? humanizedDefault : translated;
  };
}
