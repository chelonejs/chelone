/**
 * `useTranslateLabel()` — the Vue twin of `@chelone/react`'s
 * `label/use-translate-label.tsx`. Returns a resolver
 * `({ source, label?, resource? }) => string | null` that computes a field's
 * displayable label text:
 * - `label === false` or `label === ""` → `null` (render no label);
 * - a non-empty string `label` → translate it (echoing itself on a miss);
 * - otherwise translate `resources.${resource}.fields.${source}`, falling back
 *   to the humanized field name when the key is missing.
 *
 * The default label KEY follows ra-core's `getFieldLabelTranslationArgs`:
 * digits are stripped from the source (`tags.0.url` → `tags.url`), and the
 * humanized DEFAULT is derived from the source SUFFIX after the last index
 * (`tags.0.url` → `url` → `Url`). The resource comes from the `resource`
 * option, the ambient source scope's `getLabel(source)`, or the ambient
 * `ResourceContext`.
 *
 * Idiom translation from the React twin: React returns a `ReactNode` (a label
 * may be a node); Vue keeps the resolver STRING-typed (`string | null`) and
 * handles a custom-node label at the `<FieldLabelText>` component seam via a
 * slot, so this composable stays presentation-free and fully typed. Core's
 * `translate` echoes the key on a miss (no polyglot `_`), so the
 * humanized-field fallback is applied here when `translate(key) === key`.
 */

import { useSourceScope } from "../form/form-context";
import { useTranslate } from "../i18n/use-translate";
import { useResourceContext } from "../resource-context";
import { humanizeField } from "./inflection";

/** Options accepted by the resolver `useTranslateLabel` returns. */
export interface TranslateLabelOptions {
  source?: string;
  /** A string is translated; `false`/`""` resolves to `null` (no label). */
  label?: string | false;
  resource?: string;
}

/** The field-label resolver `useTranslateLabel` returns. */
export type TranslateLabel = (options: TranslateLabelOptions) => string | null;

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

/**
 * Resolve field labels against the ambient i18n + resource + source scope. The
 * returned resolver reads those ambient values at call time, so it stays
 * reactive to a locale/resource change (the caller wraps it in a `computed`).
 */
export function useTranslateLabel(): TranslateLabel {
  const translate = useTranslate();
  const resourceFromContext = useResourceContext();
  const sourceScope = useSourceScope();

  return ({
    source,
    label,
    resource,
  }: TranslateLabelOptions): string | null => {
    if (label === false || label === "") return null;

    // An explicit string label: translate it, defaulting to itself.
    if (typeof label === "string") {
      return translate(label, { _: label });
    }

    if (source == null) return "";

    const { sourceWithoutDigits, sourceSuffix } = getSourceParts(source);
    const humanizedDefault = humanizeField(sourceSuffix.replace(/\./g, " "));

    // Resolve the translation key: an explicit `resource` wins; else the
    // ambient source scope's label key; else the ambient resource.
    let key: string;
    if (resource) {
      key = fieldLabelKey(resource, sourceWithoutDigits);
    } else {
      const contextLabel = sourceScope.getLabel(source);
      key =
        contextLabel && contextLabel !== source
          ? contextLabel
          : fieldLabelKey(
              resourceFromContext ?? "undefined",
              sourceWithoutDigits,
            );
    }

    const translated = translate(key);
    return translated === key ? humanizedDefault : translated;
  };
}
