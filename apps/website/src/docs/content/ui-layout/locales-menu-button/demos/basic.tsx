import { createI18n, defaultMessages } from "@chelone/core";
import {
  CheloneProvider,
  LocalesMenuButton,
  useCheloneContext,
} from "@chelone/react";
import { useState } from "react";

/** `<LocalesMenuButton>` switches between English and French. */
export default function LocalesMenuButtonDemo() {
  const context = useCheloneContext();
  const [i18n] = useState(() =>
    createI18n({
      locale: "en",
      messages: { en: defaultMessages, fr: defaultMessages },
    }),
  );

  return (
    <CheloneProvider {...context} i18n={i18n}>
      <LocalesMenuButton />
    </CheloneProvider>
  );
}
