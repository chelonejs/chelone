/**
 * The Team page: who may do what, and the words the admin speaks.
 *
 * "Browsing as" picks a role, and `makeDemoAuthProvider` answers every access
 * check from that role's row of the role matrix, so the menu and the resource
 * pages follow it. The matrix sits behind `<CanAccess>` on a `roles` resource
 * only admins hold, so choosing another role hides it. Below it,
 * `<I18nKeyEditor>` lists the keys the current locale lacks: pick a language
 * in the app bar and type, and the strings on the page change as you type.
 */

import type { PermissionMatrixValue } from "@chelone/core";
import {
  DEFAULT_ROLE,
  defaultPermissions,
  PERMISSIONS_KEY,
  ROLE_KEY,
  TEAM_RESOURCES,
  TEAM_ROLES,
} from "@chelone/demo-data";
import {
  CanAccess,
  I18nKeyEditor,
  PermissionMatrix,
  useLocale,
  useStore,
  useTranslate,
} from "@chelone/react";
import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { demoI18n, missingKeys } from "../i18n";

export const title = "Team";
export const group = "Team";

export default function TeamPage() {
  const translate = useTranslate();
  // `translate` re-reads on a locale change only, so a translation typed into
  // the panel re-renders this page through the bridge's own subscription.
  useSyncExternalStore(demoI18n.subscribe, demoI18n.version);
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [role = DEFAULT_ROLE, setRole] = useStore<string>(
    ROLE_KEY,
    DEFAULT_ROLE,
  );
  const [permissions = defaultPermissions, setPermissions] =
    useStore<PermissionMatrixValue>(PERMISSIONS_KEY, defaultPermissions);

  // Access answers are cached, so a change to either key drops them.
  const refreshAccess = () =>
    queryClient.invalidateQueries({ queryKey: ["auth", "canAccess"] });

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          {translate("demo.team.title", { _: "Team" })}
        </h1>
        <p className="text-muted-foreground">
          {translate("demo.team.intro", {
            _: "Pick a role to browse the admin as it, and edit what each role may do.",
          })}
        </p>
      </header>

      <section aria-label="Browsing as" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">
          {translate("demo.team.browsing_as", { _: "Browsing as" })}
        </h2>
        <div className="flex flex-wrap gap-2">
          {TEAM_ROLES.map((name) => (
            <Button
              key={name}
              type="button"
              size="sm"
              variant={name === role ? "default" : "outline"}
              aria-pressed={name === role}
              onClick={() => {
                setRole(name);
                void refreshAccess();
              }}
            >
              {name}
            </Button>
          ))}
        </div>
      </section>

      <CanAccess
        action="edit"
        resource="roles"
        accessDenied={
          <p
            role="status"
            className="rounded-md border border-dashed p-4 text-sm text-muted-foreground"
          >
            {translate("demo.team.admins_only", {
              _: "Only admins edit what each role may do. Browse as admin to see the role matrix.",
            })}
          </p>
        }
      >
        <section aria-label="Role matrix" className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">
            {translate("demo.team.matrix", { _: "Role matrix" })}
          </h2>
          <PermissionMatrix
            roles={TEAM_ROLES}
            resources={TEAM_RESOURCES}
            value={permissions}
            onChange={(next) => {
              setPermissions(next);
              void refreshAccess();
            }}
          />
        </section>
      </CanAccess>

      <section aria-label="Translations" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">
          {translate("demo.team.translations", { _: "Translations" })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {translate("demo.team.translations_help", {
            _: "This panel lists the keys the {locale} catalog lacks. Pick Français in the app bar, type a translation and the text on this page changes.",
            locale,
          })}
        </p>
        {/* The panel is fixed to the viewport by default; static keeps it here. */}
        <I18nKeyEditor store={missingKeys} className="static w-full max-w-md" />
      </section>
    </div>
  );
}
