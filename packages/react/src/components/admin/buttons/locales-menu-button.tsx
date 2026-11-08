/**
 * `<LocalesMenuButton>` — switch the interface language from the app bar.
 * Ported from shadmin `buttons/locales-menu-button.tsx`; the seams are rewired
 * to `@chelone/react`'s `useLocales` + `useLocaleState`.
 *
 * Chelone divergence: languages are named in their own language by `Intl`,
 * where shadmin takes the names from the i18n provider.
 */

import { Check } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useLocaleState, useLocales } from "../../../compat-hooks";
import { useCheloneContext } from "../../../context";
import { useTranslate } from "../../../i18n-hooks";

export interface LocalesMenuButtonProps {
  ref?: Ref<HTMLButtonElement>;
  /** Shown in the trigger instead of the upper-cased current locale code. */
  icon?: ReactNode;
  /**
   * Replaces the languages listed by `useLocales()`. Codes the i18n instance has
   * no catalog for are left out, since choosing one would throw.
   */
  languages?: { locale: string; name: string }[];
}

/**
 * A ghost icon button that opens a menu of the available languages, with a check
 * on the current one. Renders nothing with fewer than two languages. Included in
 * the default `<AppBar>` toolbar.
 *
 * @example
 * import { LocalesMenuButton } from "@chelone/react";
 *
 * const MyToolbar = () => (
 *   <LocalesMenuButton
 *     languages={[
 *       { locale: "en", name: "English" },
 *       { locale: "fr", name: "Français" },
 *     ]}
 *   />
 * );
 */
function LocalesMenuButton({
  ref,
  icon,
  languages: languagesProp,
}: LocalesMenuButtonProps = {}) {
  const i18n = useCheloneContext().i18n;
  const defaultLanguages = useLocales();
  if (!i18n) return null;
  const registered = new Set(i18n.getLocales());
  const languages = (languagesProp ?? defaultLanguages).filter(({ locale }) =>
    registered.has(locale),
  );
  if (languages.length <= 1) return null;
  return <LocalesMenu ref={ref} icon={icon} languages={languages} />;
}

// Split out so `useLocaleState`, which throws without i18n, only runs once there
// is an i18n instance and languages to switch between.
function LocalesMenu({
  ref,
  icon,
  languages,
}: Required<Pick<LocalesMenuButtonProps, "languages">> &
  Omit<LocalesMenuButtonProps, "languages">) {
  const [locale, setLocale] = useLocaleState();
  const translate = useTranslate();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:inline-flex"
          aria-label={translate("chelone.action.change_locale", {
            _: "Change locale",
          })}
          ref={ref}
        >
          {icon ?? locale.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.locale}
            onClick={() => setLocale(language.locale)}
          >
            {language.name}
            <Check
              className={cn("ml-auto", locale !== language.locale && "hidden")}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { LocalesMenuButton };
