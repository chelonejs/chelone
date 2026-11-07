/**
 * `<CommandMenu>` — a palette on Cmd/Ctrl+K that jumps to resources and
 * records and runs actions. The hotkey, recents and command registry live in
 * `@chelone/core`; this file is the React shell around them.
 *
 * Mount it around the layout in the `Admin.Layout` slot:
 *
 * @example
 * const AppLayout = ({ children }) => (
 *   <CommandMenu>
 *     <Layout>{children}</Layout>
 *   </CommandMenu>
 * );
 *
 * <Admin.Layout>
 *   <AppLayout />
 * </Admin.Layout>
 */

import {
  canAccessQueryOptions,
  createCommandRegistry,
  DEFAULT_RECENTS_LIMIT,
  DEFAULT_SEARCH_DEBOUNCE_MS,
  getVisibleCommands,
  groupCommands,
  type RecentEntry,
  type ResourceDefinition,
  recentsKey,
  rememberRecent,
  shouldHandleHotkey,
} from "@chelone/core";
import { useQueries } from "@tanstack/react-query";
import { History, List, Monitor, Moon, RefreshCw, Sun } from "lucide-react";
import {
  type ComponentType,
  createElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { useLogout } from "../../../auth-hooks";
import { useRefresh } from "../../../compat-hooks";
import { useCheloneContext } from "../../../context";
import { useGetList } from "../../../hooks";
import { useTranslate } from "../../../i18n-hooks";
import {
  useGetRecordRepresentation,
  useGetResourceLabel,
} from "../../../label";
import { useResourceDefinitions } from "../../../resource";
import { useCreatePath, useNavigate } from "../../../router";
import { useStore } from "../../../store-hooks";
import { useEvent } from "../../../util/use-event";
import {
  type CommandMenuAction,
  CommandMenuContext,
  type CommandMenuContextValue,
  useRegisterCommand,
} from "./command-menu-context";
import { useMenuAccess } from "./use-menu-access";
import { useTheme } from "./use-theme";

export interface CommandMenuProps {
  /** Bindings that toggle the menu, as `"mod+k"`. `false` for none. */
  hotkey?: string[] | false;
  /** Names of the resources to list and search. Defaults to every resource. */
  resources?: string[];
  /** Filter key per resource for the record search. Defaults to `"q"`. */
  searchFields?: Record<string, string>;
  /** Records fetched per resource for one search. */
  perResourceLimit?: number;
  /** Recent picks kept. Default `10`. */
  recentsLimit?: number;
  /** Extra commands. Use `useRegisterCommand` for ones that come and go. */
  actions?: CommandMenuAction[];
  placeholder?: string;
  /** Wait after the last keystroke before records are searched. Default `250`. */
  searchDebounceMs?: number;
  /** Rendered outside the dialog, so helpers can call `useRegisterCommand`. */
  children?: ReactNode;
}

const defaultHotkey = ["mod+k"];

const defaultGroupHeadings: Record<string, string> = {
  recent: "Recent",
  records: "Records",
  resources: "Resources",
  actions: "Actions",
  theme: "Theme",
};

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    if (ms <= 0) {
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function isComponentIcon(icon: unknown): icon is ComponentType {
  return typeof icon === "function";
}

/** The view a record opens: show, else edit, else none. */
function recordViewType(definition: ResourceDefinition) {
  if (definition.hasShow) return "show";
  if (definition.hasEdit) return "edit";
  return undefined;
}

function recordLabel(representation: ReactNode, id: string | number): string {
  return typeof representation === "string" ||
    typeof representation === "number"
    ? String(representation)
    : `#${id}`;
}

function commandValue(action: CommandMenuAction): string {
  return typeof action.label === "string" ? action.label : action.id;
}

function CommandMenu({
  hotkey = defaultHotkey,
  resources,
  searchFields,
  perResourceLimit = 5,
  recentsLimit = DEFAULT_RECENTS_LIMIT,
  actions,
  placeholder,
  searchDebounceMs = DEFAULT_SEARCH_DEBOUNCE_MS,
  children,
}: CommandMenuProps) {
  const translate = useTranslate();
  const { authProvider, notifications } = useCheloneContext();
  const definitions = useResourceDefinitions();
  const createPath = useCreatePath();
  const navigate = useNavigate();
  const refresh = useRefresh();
  const [, setTheme] = useTheme();
  const [recents, setRecents] = useStore<RecentEntry[]>(recentsKey, []);

  const [isOpen, setIsOpenState] = useState(false);
  const [query, setQueryState] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), searchDebounceMs);

  const [registry] = useState(() =>
    createCommandRegistry<ReactNode, ReactNode>(),
  );
  const registered = useSyncExternalStore(
    registry.store.subscribe,
    () => registry.store.getSnapshot().commands,
    () => registry.store.getSnapshot().commands,
  );

  const setOpen = useEvent((next: boolean) => {
    setIsOpenState(next);
    if (!next) setQueryState("");
  });
  const isOpenNow = useEvent(() => isOpen);

  const contextValue = useMemo<CommandMenuContextValue>(
    () => ({
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen(!isOpenNow()),
      setQuery: setQueryState,
      registerCommand: registry.register,
      unregisterCommand: registry.unregister,
    }),
    [isOpen, isOpenNow, registry, setOpen],
  );

  // The listener reads the newest `hotkey` without rebinding on each render.
  const onKeyDown = useEvent((event: KeyboardEvent) => {
    if (!hotkey) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (hotkey.some((binding) => shouldHandleHotkey(event, binding, target))) {
      event.preventDefault();
      setOpen(!isOpen);
    }
  });
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  const builtIn = useMemo<CommandMenuAction[]>(
    () => [
      {
        id: "refresh",
        label: translate("chelone.command_menu.action.refresh", {
          _: "Refresh data",
        }),
        icon: <RefreshCw />,
        onSelect: refresh,
      },
      {
        id: "theme-light",
        group: "theme",
        label: translate("chelone.command_menu.action.theme_light", {
          _: "Switch to light theme",
        }),
        icon: <Sun />,
        onSelect: () => setTheme("light"),
      },
      {
        id: "theme-dark",
        group: "theme",
        label: translate("chelone.command_menu.action.theme_dark", {
          _: "Switch to dark theme",
        }),
        icon: <Moon />,
        onSelect: () => setTheme("dark"),
      },
      {
        id: "theme-system",
        group: "theme",
        label: translate("chelone.command_menu.action.theme_system", {
          _: "Use system theme",
        }),
        icon: <Monitor />,
        onSelect: () => setTheme("system"),
      },
    ],
    [translate, refresh, setTheme],
  );

  const commandGroups = groupCommands(
    getVisibleCommands([...builtIn, ...(actions ?? []), ...registered]),
  );

  const resourceNames = Object.values(definitions)
    .filter(
      (definition) =>
        definition.hasList &&
        (!resources || resources.includes(definition.name)),
    )
    .map((definition) => definition.name);

  const remember = useEvent((entry: RecentEntry) => {
    setRecents(rememberRecent(recents ?? [], entry, recentsLimit));
    setOpen(false);
  });

  const goTo = useEvent((entry: RecentEntry) => {
    const definition = definitions[entry.resource];
    if (!definition) return;
    if (entry.type === "resource") {
      navigate(createPath({ resource: entry.resource, type: "list" }));
    } else {
      const type = recordViewType(definition);
      if (!type || entry.id === undefined) return;
      navigate(createPath({ resource: entry.resource, type, id: entry.id }));
    }
    remember(entry);
  });

  const runCommand = useEvent(async (action: CommandMenuAction) => {
    let failure: unknown;
    let failed = false;
    try {
      await action.onSelect();
    } catch (error) {
      failed = true;
      failure = error;
    }
    setOpen(false);
    if (failed) {
      notifications?.notify("chelone.notification.http_error", {
        type: "error",
        messageArgs: { _: String(failure) },
      });
    }
  });

  const groupHeading = (name: string) =>
    translate(`chelone.command_menu.group.${name}`, {
      _: defaultGroupHeadings[name] ?? name,
    });

  const title = translate("chelone.command_menu.title", {
    _: "Command menu",
  });
  const description = translate("chelone.command_menu.description", {
    _: "Jump to a page or record, or run an action.",
  });

  const body = (
    <MenuBody
      query={query}
      onQueryChange={setQueryState}
      debouncedQuery={debouncedQuery}
      placeholder={
        placeholder ??
        translate("chelone.command_menu.placeholder", {
          _: "Search or run a command...",
        })
      }
      recents={query === "" ? (recents ?? []) : []}
      resourceNames={resourceNames}
      searchFields={searchFields}
      perResourceLimit={perResourceLimit}
      commandGroups={commandGroups}
      groupHeading={groupHeading}
      onGoTo={goTo}
      onRunCommand={runCommand}
    />
  );

  return (
    <CommandMenuContext.Provider value={contextValue}>
      {authProvider ? <LogoutCommand /> : null}
      {children}
      <CommandDialog
        open={isOpen}
        onOpenChange={setOpen}
        title={title}
        description={description}
      >
        {body}
      </CommandDialog>
    </CommandMenuContext.Provider>
  );
}

/** Registers `Log out`. Mounted only with an `authProvider`: `useLogout` throws without one. */
function LogoutCommand() {
  const translate = useTranslate();
  const logout = useLogout();
  useRegisterCommand({
    id: "logout",
    label: translate("chelone.command_menu.action.logout", { _: "Log out" }),
    onSelect: async () => {
      await logout.mutateAsync(undefined);
    },
  });
  return null;
}

interface MenuBodyProps {
  query: string;
  onQueryChange: (query: string) => void;
  debouncedQuery: string;
  placeholder: string;
  recents: RecentEntry[];
  resourceNames: string[];
  searchFields: Record<string, string> | undefined;
  perResourceLimit: number;
  commandGroups: [string, CommandMenuAction[]][];
  groupHeading: (name: string) => string;
  onGoTo: (entry: RecentEntry) => void;
  onRunCommand: (action: CommandMenuAction) => void;
}

function MenuBody({
  query,
  onQueryChange,
  debouncedQuery,
  placeholder,
  recents,
  resourceNames,
  searchFields,
  perResourceLimit,
  commandGroups,
  groupHeading,
  onGoTo,
  onRunCommand,
}: MenuBodyProps) {
  const translate = useTranslate();
  const definitions = useResourceDefinitions();
  const [hitCounts, setHitCounts] = useState<Record<string, number>>({});
  const setHitCount = useCallback((resource: string, count: number) => {
    setHitCounts((prev) =>
      prev[resource] === count ? prev : { ...prev, [resource]: count },
    );
  }, []);
  const searching = query.trim() !== "";
  const hitTotal = searching
    ? Object.values(hitCounts).reduce((sum, count) => sum + count, 0)
    : 0;

  const listable = useListableResources(recents.map((e) => e.resource));
  const openableRecents = recents.filter((entry) => {
    const definition = definitions[entry.resource];
    if (!definition || !listable.has(entry.resource)) return false;
    return entry.type === "resource"
      ? definition.hasList
      : recordViewType(definition) !== undefined;
  });

  return (
    <>
      <CommandInput
        value={query}
        onValueChange={onQueryChange}
        placeholder={placeholder}
      />
      <CommandList>
        {hitTotal === 0 ? (
          <CommandEmpty>
            {translate("chelone.command_menu.empty", {
              _: "No results found.",
            })}
          </CommandEmpty>
        ) : null}
        {openableRecents.length > 0 ? (
          <CommandGroup heading={groupHeading("recent")}>
            {openableRecents.map((entry) => (
              <CommandItem
                key={`${entry.type}:${entry.resource}:${entry.id ?? ""}`}
                value={`recent:${entry.type}:${entry.resource}:${entry.id ?? ""}`}
                onSelect={() => onGoTo(entry)}
              >
                <History />
                {entry.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {searching ? (
          <CommandGroup
            forceMount
            heading={hitTotal > 0 ? groupHeading("records") : undefined}
          >
            {resourceNames.map((name) => (
              <ResourceHits
                key={name}
                resource={name}
                query={debouncedQuery}
                field={searchFields?.[name] ?? "q"}
                limit={perResourceLimit}
                onCount={setHitCount}
                onGoTo={onGoTo}
              />
            ))}
          </CommandGroup>
        ) : null}
        <CommandGroup heading={groupHeading("resources")}>
          {resourceNames.map((name) => (
            <ResourceItem key={name} resource={name} onGoTo={onGoTo} />
          ))}
        </CommandGroup>
        {commandGroups.map(([name, commands]) => (
          <CommandGroup key={name} heading={groupHeading(name)}>
            {commands.map((action) => (
              <CommandItem
                key={action.id}
                value={commandValue(action)}
                keywords={action.keywords}
                onSelect={() => onRunCommand(action)}
              >
                {action.icon}
                {action.label}
                {action.shortcut ? (
                  <CommandShortcut>{action.shortcut}</CommandShortcut>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
      <MenuFooter />
    </>
  );
}

/**
 * The subset of `names` the user may list, like `useMenuAccess` for a dynamic
 * set. Pending counts as denied, so a saved recent never flashes before the
 * check resolves.
 */
function useListableResources(names: string[]): Set<string> {
  const { authProvider } = useCheloneContext();
  const unique = [...new Set(names)];
  const checked = authProvider?.canAccess != null;
  const results = useQueries({
    queries: unique.map((resource) => ({
      ...canAccessQueryOptions(authProvider, { resource, action: "list" }),
      enabled: checked,
    })),
  });
  return new Set(
    unique.filter((_, index) => !checked || results[index]?.data === true),
  );
}

function ResourceItem({
  resource,
  onGoTo,
}: {
  resource: string;
  onGoTo: (entry: RecentEntry) => void;
}) {
  const { canAccess } = useMenuAccess({ resource, action: "list" });
  const definitions = useResourceDefinitions();
  const getResourceLabel = useGetResourceLabel();
  if (!canAccess) return null;

  const label = getResourceLabel(resource, 2);
  const icon = definitions[resource]?.icon;
  return (
    <CommandItem
      value={label}
      keywords={[resource]}
      onSelect={() => onGoTo({ type: "resource", resource, label })}
    >
      {isComponentIcon(icon) ? createElement(icon) : <List />}
      {label}
    </CommandItem>
  );
}

interface ResourceHitsProps {
  resource: string;
  query: string;
  field: string;
  limit: number;
  onCount: (resource: string, count: number) => void;
  onGoTo: (entry: RecentEntry) => void;
}

/** One `useGetList` per resource, hence a component of its own. */
function ResourceHits({
  resource,
  query,
  field,
  limit,
  onCount,
  onGoTo,
}: ResourceHitsProps) {
  const { canAccess } = useMenuAccess({ resource, action: "list" });
  const definitions = useResourceDefinitions();
  const getRecordRepresentation = useGetRecordRepresentation(resource);
  const { data } = useGetList(
    resource,
    {
      filter: { [field]: query },
      pagination: { page: 1, perPage: limit },
    },
    { enabled: canAccess && query !== "" },
  );

  const definition = definitions[resource];
  const hits =
    canAccess && query !== "" && definition && recordViewType(definition)
      ? (data?.data ?? [])
      : [];

  useEffect(() => {
    onCount(resource, hits.length);
    return () => onCount(resource, 0);
  }, [onCount, resource, hits.length]);

  return hits.map((record) => {
    const representation = getRecordRepresentation(record);
    const id = record.id;
    return (
      <CommandItem
        key={id}
        forceMount
        value={`record:${resource}:${id}`}
        onSelect={() =>
          onGoTo({
            type: "record",
            resource,
            id,
            label: recordLabel(representation, id),
          })
        }
      >
        {representation}
      </CommandItem>
    );
  });
}

function MenuFooter() {
  const translate = useTranslate();
  return (
    <div
      data-slot="command-menu-footer"
      className="flex items-center gap-4 border-t px-3 py-2 text-xs text-muted-foreground"
    >
      <span className="flex items-center gap-1">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
        {translate("chelone.command_menu.footer.navigate", { _: "Navigate" })}
      </span>
      <span className="flex items-center gap-1">
        <Kbd>↵</Kbd>
        {translate("chelone.command_menu.footer.select", { _: "Select" })}
      </span>
      <span className="flex items-center gap-1">
        <Kbd>Esc</Kbd>
        {translate("chelone.command_menu.footer.close", { _: "Close" })}
      </span>
    </div>
  );
}

export { CommandMenu };
