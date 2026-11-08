import { testI18nProviderContract } from "@chelone/test-utils/i18n-provider-contract";
import { createI18n } from "./i18n";

/** `createI18n` against the contract every `<Admin i18n>` engine must honour. */
testI18nProviderContract((options) => createI18n(options));
