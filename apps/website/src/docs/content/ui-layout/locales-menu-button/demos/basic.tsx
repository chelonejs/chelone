import { createI18n, defineMessages } from "@chelone/core";
import {
  CheloneProvider,
  LocalesMenuButton,
  useCheloneContext,
  useTranslate,
} from "@chelone/react";
import { useState } from "react";

function LocaleSelector() {
  const translate = useTranslate();

  return (
    <div className="flex items-center gap-2 [&_button]:inline-flex">
      <span>{translate("chelone.action.change_locale")}</span>
      <LocalesMenuButton />
    </div>
  );
}

/** `<LocalesMenuButton>` switches the prompt and button label between English and French. */
export default function LocalesMenuButtonDemo() {
  const context = useCheloneContext();
  const [i18n] = useState(() =>
    createI18n({
      locale: "en",
      messages: {
        en: defineMessages({ "chelone.action.change_locale": "Change locale" }),
        fr: defineMessages({
          "chelone.action.change_locale": "Changer de langue",
        }),
      },
    }),
  );

  return (
    <CheloneProvider {...context} i18n={i18n}>
      <LocaleSelector />
    </CheloneProvider>
  );
}
