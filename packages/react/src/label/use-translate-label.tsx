/**
 * `useTranslateLabel()` — returns `({ source, label?, resource? }) =>
 * ReactNode` (parity: ra-core `useTranslateLabel`). Resolves a field label:
 * - `label === false` or `label === ""` → `null` (render no label);
 * - a non-string `label` (a ReactNode) → returned verbatim;
 * - otherwise translate `resources.${resource}.fields.${source}`, falling back
 *   to the humanized field name when the key is missing.
 *
 * The default label KEY follows ra-core's `getFieldLabelTranslationArgs`:
 * digits are stripped from the source (`tags.0.url` → `tags.url`), the humanized
 * DEFAULT is derived from the source SUFFIX after the last index (`tags.0.url`
 * → `url` → `Url`), and the resource comes from the `resource` prop, the ambient
 * `SourceContext.getLabel(source)`, or the ambient `ResourceContext`.
 *
 * Chelone divergence (documented): ra-core uses polyglot `_`; chelone
 * `translate` echoes the key on a miss, so the humanized-field fallback is
 * applied here (the `resolveNotificationKey` convention).
 */

import { type ReactNode, useCallback } from "react";
import { useSourceContext } from "../form-context";
import { useTranslate } from "../i18n-hooks";
import { useResourceContext } from "../resource";
import { humanizeField } from "./inflection";

/** Options for the resolver `useTranslateLabel` returns. */
export interface TranslateLabelOptions {
  source?: string;
  label?: ReactNode;
  resource?: string;
}

/** The field-label resolver `useTranslateLabel` returns. */
export type TranslateLabel = (options: TranslateLabelOptions) => ReactNode;

/**
 * Split a source into its digit-free path and the suffix after the last index.
 * `pictures.0.url` → `{ sourceWithoutDigits: "pictures.url", sourceSuffix:
 * "url" }`; `pictures` → `{ "pictures", "pictures" }`.
 */
function getSourceParts(source: string): {
  sourceWithoutDigits: string;
  sourceSuffix: string;
} {
  const sourceWithoutDigits = source.replace(/\.\d+\./g, ".");
  const parts = source.split(".");
  let lastIndex: number | undefined;
  parts.forEach((part, index) => {
    if (part.length > 0 && /^\d+$/.test(part)) lastIndex = index;
  });
  const sourceSuffix =
    lastIndex != null ? parts.slice(lastIndex + 1).join(".") : source;
  return { sourceWithoutDigits, sourceSuffix };
}

const fieldLabelKey = (resource: string, source: string): string =>
  `resources.${resource}.fields.${source}`;

export function useTranslateLabel(): TranslateLabel {
  const translate = useTranslate();
  const resourceFromContext = useResourceContext();
  const sourceContext = useSourceContext();

  return useCallback(
    ({ source, label, resource }: TranslateLabelOptions): ReactNode => {
      if (label === false || label === "") return null;
      if (label != null && typeof label !== "string") return label;

      // An explicit string label: translate it, defaulting to itself.
      if (typeof label === "string") {
        const translated = translate(label, {});
        return translated === label ? label : translated;
      }

      if (source == null) return "";

      const { sourceWithoutDigits, sourceSuffix } = getSourceParts(source);
      const humanizedDefault = humanizeField(sourceSuffix.replace(/\./g, " "));

      // Resolve the translation key: an explicit `resource` wins; else the
      // ambient SourceContext's label key; else the ambient resource.
      let key: string;
      if (resource) {
        key = fieldLabelKey(resource, sourceWithoutDigits);
      } else {
        const contextLabel = sourceContext.getLabel(source);
        key =
          contextLabel && contextLabel !== source
            ? contextLabel
            : fieldLabelKey(
                resourceFromContext ?? "undefined",
                sourceWithoutDigits,
              );
      }

      const translated = translate(key, {});
      return translated === key ? humanizedDefault : translated;
    },
    [translate, resourceFromContext, sourceContext],
  );
}
