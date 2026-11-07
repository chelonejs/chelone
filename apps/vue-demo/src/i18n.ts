import { makeDemoI18n } from "@chelone/demo-data";

/**
 * The app's i18n, the store of keys its current locale lacks, and the
 * subscription to translations typed into it. The Team page mounts
 * `<I18nKeyEditor>` on the store, so it lives here, where `App.vue` and the
 * page both reach it.
 */
export const demoI18n = makeDemoI18n();
export const { i18n, missingKeys } = demoI18n;
