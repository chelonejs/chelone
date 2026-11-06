/**
 * `<I18nKeyEditor>` — a fixed panel listing the keys the current locale
 * missed, with an input per key and an export of the typed translations as
 * JSON. Ported from shadmin `widgets/i18n-key-editor.tsx`, which wrapped the
 * i18n provider; here it only reads the `MissingKeyStore` the app's
 * `createI18n` writes to through `onMissingKey`.
 */

import type { MissingKeyEntry, MissingKeyStore } from "@chelone/core";
import { Check, ChevronDown, ChevronUp, Copy } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLocale, useTranslate } from "../../../i18n-hooks";
import { useNotify } from "../../../notification-hooks";

const COPIED_MS = 1500;
const OWN_KEY_PREFIX = "chelone.i18n_key_editor.";

/**
 * Pinned at the bottom left of the viewport. Goes anywhere under `<Admin>`,
 * renders no children and leaves the i18n context as `<Admin>` set it. Wire the
 * store once with `createI18n({ onMissingKey: store.record })`.
 *
 * The panel's own labels are never listed, so it does not report itself when
 * the catalog lacks them.
 *
 * @example
 * import { createMissingKeyStore } from "@chelone/core";
 * import { I18nKeyEditor } from "@chelone/react";
 *
 * const store = createMissingKeyStore();
 * const i18n = createI18n({ locale: "en", messages, onMissingKey: store.record });
 * const Translating = () => <I18nKeyEditor store={store} />;
 */
function I18nKeyEditor({
  store,
  defaultOpen = true,
  showExport = true,
  className,
}: I18nKeyEditorProps) {
  const translate = useTranslate();
  const notify = useNotify();
  const locale = useLocale();
  const recorded = useSyncExternalStore(
    store.subscribe,
    useCallback(() => store.getEntries(locale), [store, locale]),
    useCallback(() => store.getEntries(locale), [store, locale]),
  );
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const entries = recorded.filter(
    (entry) => !entry.key.startsWith(OWN_KEY_PREFIX),
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(store.toJson(locale));
    } catch {
      notify(
        translate("chelone.i18n_key_editor.copy_failed", {
          _: "Could not copy the translations",
        }),
        { type: "error" },
      );
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <Card
      data-slot="i18n-key-editor"
      data-open={open}
      className={cn(
        "fixed bottom-4 left-4 z-50 w-80 max-w-[calc(100vw-2rem)] gap-2 p-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">
          {translate("chelone.i18n_key_editor.title", {
            count: entries.length,
            _: "Missing keys ({count})",
          })}
        </h2>
        <div className="flex items-center gap-1">
          {showExport ? (
            <Button type="button" variant="outline" size="sm" onClick={copy}>
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied
                ? translate("chelone.i18n_key_editor.copied", { _: "Copied" })
                : translate("chelone.i18n_key_editor.export", {
                    _: "Export",
                  })}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronUp className="size-4" />
            )}
            {open
              ? translate("chelone.i18n_key_editor.hide", { _: "Hide" })
              : translate("chelone.i18n_key_editor.show", { _: "Show" })}
          </Button>
        </div>
      </div>
      {open ? (
        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {translate("chelone.i18n_key_editor.empty", {
                _: "No missing keys yet",
              })}
            </p>
          ) : (
            entries.map((entry) => (
              <KeyEntry
                key={entry.key}
                entry={entry}
                onChange={(text) =>
                  store.setTranslation(locale, entry.key, text)
                }
              />
            ))
          )}
        </div>
      ) : null}
    </Card>
  );
}

function KeyEntry({
  entry,
  onChange,
}: {
  entry: MissingKeyEntry;
  onChange: (text: string) => void;
}) {
  return (
    <div data-slot="i18n-key-editor-entry" className="flex flex-col gap-1">
      <span className="break-all font-mono text-xs text-muted-foreground">
        {entry.key}
      </span>
      <Input
        aria-label={entry.key}
        value={entry.translation}
        placeholder={entry.fallback}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

interface I18nKeyEditorProps {
  /** The store the app's `createI18n` writes to through `onMissingKey: store.record`. */
  store: MissingKeyStore;
  /** Start with the list showing. Default `true`. */
  defaultOpen?: boolean;
  /** Show the button that copies the typed translations as JSON. Default `true`. */
  showExport?: boolean;
  className?: string;
}

export { I18nKeyEditor, type I18nKeyEditorProps };
