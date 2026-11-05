/**
 * `useResourceTranslation({ resourceI18nKey?, baseI18nKey, userText?, options?
 * })` — resolve a resource-scoped label with a global fallback (parity: ra-core
 * `useResourceTranslation`). Precedence:
 * - `userText` set: a non-string ReactNode → verbatim; a string → translated
 *   with itself as default;
 * - no `resourceI18nKey` → translate `baseI18nKey`;
 * - otherwise translate `resourceI18nKey`, defaulting to `baseI18nKey`.
 *
 * Chelone divergence (documented): ra-core threads a polyglot `_` default;
 * chelone `translate` echoes the KEY on a miss, so this hook applies the
 * fallback explicitly — a `resourceI18nKey` that echoes falls through to the
 * translated `baseI18nKey`, matching the `resolveNotificationKey` convention.
 */

import type { TranslateParamValues } from "@chelone/core";
import { type ReactNode, useMemo } from "react";
import { useTranslate } from "../i18n-hooks";

export interface UseResourceTranslationOptions {
  resourceI18nKey?: string;
  baseI18nKey: string;
  userText?: ReactNode;
  options?: TranslateParamValues;
}

export function useResourceTranslation(
  params: UseResourceTranslationOptions,
): ReactNode {
  const { resourceI18nKey, baseI18nKey, userText, options } = params;
  const translate = useTranslate();

  return useMemo<ReactNode>(() => {
    if (userText !== undefined) {
      if (typeof userText !== "string") return userText;
      const translated = translate(userText, options ?? {});
      return translated === userText ? userText : translated;
    }

    const base = translate(baseI18nKey, options ?? {});
    if (!resourceI18nKey) return base;

    const scoped = translate(resourceI18nKey, options ?? {});
    // A miss (chelone echoes the key) falls back to the translated base key.
    return scoped === resourceI18nKey ? base : scoped;
  }, [translate, resourceI18nKey, baseI18nKey, userText, options]);
}
