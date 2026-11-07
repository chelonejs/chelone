import {
  createI18n,
  createMissingKeyStore,
  defineMessages,
} from "@chelone/core";
import {
  CheloneProvider,
  I18nKeyEditor,
  useCheloneContext,
  useTranslate,
} from "@chelone/react";
import { useState } from "react";

function Strings() {
  const translate = useTranslate();

  return (
    <ul className="list-disc pl-5 text-sm">
      <li>{translate("shop.title", { _: "Shop" })}</li>
      <li>{translate("shop.cart", { _: "Your cart" })}</li>
      <li>{translate("shop.checkout", { _: "Check out" })}</li>
    </ul>
  );
}

/**
 * The page below is in French, which has none of its three strings. Each one the
 * page asks for lands in the panel, and what you type is what Export copies. The
 * panel is fixed to the viewport by default; `static` keeps it in the preview.
 */
export default function I18nKeyEditorDemo() {
  const context = useCheloneContext();
  const [{ i18n, store }] = useState(() => {
    const store = createMissingKeyStore();
    const i18n = createI18n({
      locale: "fr",
      messages: {
        en: defineMessages({}),
        fr: defineMessages({}),
      },
      onMissingKey: store.record,
    });
    return { i18n, store };
  });

  return (
    <CheloneProvider {...context} i18n={i18n}>
      <div className="flex w-full flex-col gap-4">
        <Strings />
        <I18nKeyEditor store={store} className="static w-full max-w-md" />
      </div>
    </CheloneProvider>
  );
}
