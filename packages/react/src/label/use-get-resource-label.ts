/**
 * `useGetResourceLabel()` — returns `(resource, count?) => string` (parity:
 * ra-core `useGetResourceLabel`). Translates `resources.${resource}.name` with
 * pluralization, falling back to a humanized, count-inflected default when the
 * key is missing.
 *
 * Chelone divergence from ra-core (documented): ra-core threads polyglot's `_`
 * default-value param; chelone `translate` returns the KEY unchanged when a
 * message is missing (the `resolveNotificationKey` convention) and pluralizes
 * on `count` (not `smart_count`). So this hook implements the default-value
 * fallback explicitly (translate → if the result echoes the key, use the
 * default) and passes BOTH `count` (chelone plural selection) and `smart_count`
 * (ra-core-catalog compat).
 */

import { useCallback } from "react";
import { useTranslate } from "../i18n-hooks";
import { useResourceDefinitions } from "../resource";
import { humanize, pluralize } from "./inflection";

/** The label resolver `useGetResourceLabel` returns. */
export type GetResourceLabel = (resource: string, count?: number) => string;

export function useGetResourceLabel(): GetResourceLabel {
  const translate = useTranslate();
  const definitions = useResourceDefinitions();

  return useCallback(
    (resource: string, count = 2): string => {
      const definition = definitions[resource];
      const optionsLabel = definition?.options?.label;

      // The count-inflected humanized default (ra-core: humanize(inflect(...))).
      const humanizedDefault = humanize(pluralize(resource, count));
      // A resource may pin an explicit `options.label`; it wins over the
      // humanized default (and is itself translatable — ra-core does the same).
      const fallback =
        typeof optionsLabel === "string"
          ? translateWithDefault(translate, optionsLabel, optionsLabel, count)
          : humanizedDefault;

      return translateWithDefault(
        translate,
        `resources.${resource}.name`,
        fallback,
        count,
      );
    },
    [translate, definitions],
  );
}

/**
 * Translate `key` with pluralization, returning `fallback` when the key is
 * missing (chelone `translate` echoes the key on a miss). `count` drives both
 * chelone's `count`-based plural selection and ra-core's `smart_count`.
 */
function translateWithDefault(
  translate: (key: string, params?: Record<string, unknown>) => string,
  key: string,
  fallback: string,
  count: number,
): string {
  const translated = translate(key, { count, smart_count: count });
  return translated === key ? fallback : translated;
}
