import { makeDemoI18n } from "@chelone/demo-data";
import { supabaseEnglishMessages } from "@chelone/supabase";

/**
 * The app's i18n, the store of keys its current locale lacks, and the
 * subscription to translations typed into it. The Team page mounts
 * `<I18nKeyEditor>` on the store, so it lives here, where `App.tsx` and the
 * page both reach it. It carries the Supabase pages' messages, so the reset
 * notification reads as text.
 */
export const demoI18n = makeDemoI18n(supabaseEnglishMessages);
export const { i18n, missingKeys } = demoI18n;
