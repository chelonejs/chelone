/**
 * TabbedForm — a single form split into tabs, optionally URL-synced (P6 W2-T5,
 * plan §2 W2-T5 / decision D6e, §0c-4).
 *
 * The whole form is ONE controller; tabs only decide which panel is visible.
 * Every tab's inputs stay MOUNTED the entire time (inactive tabs are CSS-hidden,
 * never unmounted — ra-admin issue #1866) so cross-tab validation works, a
 * single submit collects the whole form, and every field stays validatable
 * regardless of which tab is showing. Per-tab validity reuses the FormGroups
 * primitive (W2-T1): each `<TabbedForm.Tab name>` opens a `<FormGroupProvider
 * name>` so its inputs auto-register, and a tab header reads `useFormGroup(name)`
 * for its validity dot.
 *
 * Two modes (`syncWithLocation`, default `true`):
 *
 * - **URL-synced** — each tab is a nested route relative to the form's splat
 *   base (the pathname minus the parent route's `*` remainder). The active tab
 *   is derived from the location via the router adapter's `matchPath`, tab
 *   headers are `Link`s (deep-linkable), and the browser back-button restores
 *   the previous tab. Relies on the Wave-1 shell fix that the form subtree stays
 *   MOUNTED across navigation — so switching tabs never wipes form state. The
 *   headers render inside a `<Routes><Route path="/*"/></Routes>` (ra parity:
 *   the relative-routing context the tab links resolve against).
 *
 * - **local** (`syncWithLocation={false}`) — a plain `useState` active tab; no
 *   router coupling, headers are buttons.
 *
 * The tab path segment (ra parity, {@link tabFullPath}): an explicit `path`
 * prop, else the tab `name` for every tab AFTER the first, else `''` (the first
 * tab is the index route). So tabs "one"/"two"/"three" live at the form base,
 * `<base>/two`, `<base>/three`.
 */

import type { PathMatch } from "@chelone/core";
import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { CheloneFormProvider } from "../form-context";
import { type UseFormOptions, useForm } from "../form-hooks";
import { useRouterAdapter } from "../router/adapter";
import { useLocation, useParams } from "../router/nav-hooks";
import {
  FormGroupProvider,
  FormGroupsProvider,
  useFormGroup,
} from "./group-hooks";

/** The headless tabbed-form controller surface. */
export interface UseTabbedFormResult {
  /** The name of the visible tab. */
  activeTab: string;
  /** Whether the tabs are URL-synced (`true`) or local `useState` (`false`). */
  syncWithLocation: boolean;
  /**
   * Show the named tab. URL-synced → navigates to the tab's path (a real
   * history entry, back-button aware); local → flips the `useState` active tab.
   * Unknown names are ignored.
   */
  goToTab(name: string): void;
  /** Submit the whole form — collects values from EVERY (mounted) tab. */
  submit(): Promise<void>;
}

const TabbedFormContext = createContext<UseTabbedFormResult | null>(null);

/**
 * The ambient tabbed-form controller (`activeTab`, `goToTab`, `submit`). Throws
 * outside a `<TabbedForm>`. Toolbar/custom nav reads this.
 */
export function useTabbedFormContext(): UseTabbedFormResult {
  const ctx = useContext(TabbedFormContext);
  if (!ctx) {
    throw new Error(
      "useTabbedFormContext: no <TabbedForm> found above this component.",
    );
  }
  return ctx;
}

/** A tab's identity marker — used to bucket `<TabbedForm.Tab>` children. */
const TAB_MARKER = "TabbedFormTab";

interface TabMarker {
  chelName?: string;
}

export interface TabbedFormTabProps {
  /** The tab name — also its FormGroup name (its inputs register into it). */
  name: string;
  /** The tab header label (a string or a node). */
  label?: ReactNode;
  /**
   * The URL path segment for this tab (URL-synced mode). Defaults to the tab
   * `name` for every tab after the first, and `''` (the index) for the first.
   */
  path?: string;
  children?: ReactNode;
}

/** A resolved tab descriptor (order-indexed) the shell drives off. */
interface TabDescriptor {
  name: string;
  label: ReactNode;
  /** The path segment (`''` for the first/index tab). */
  path: string;
}

/**
 * The URL path segment for a tab (ra parity): an explicit `path` prop wins;
 * otherwise the tab `name` for every tab after the first, and `''` (the index
 * route) for the first.
 */
function tabFullPath(props: TabbedFormTabProps, index: number): string {
  if (props.path != null) return props.path;
  return index > 0 ? props.name : "";
}

/**
 * One tab of a `<TabbedForm>`. Its inputs register into a FormGroup named
 * `name` (so a header can aggregate exactly this tab's validity), and the whole
 * panel stays mounted — hidden (not unmounted) when it is not the active tab, so
 * cross-tab values and validation survive navigation.
 *
 * The panel's `hidden`/`value` are injected by the shell via `cloneElement`
 * (the author writes only `<TabbedForm.Tab name label>…`).
 */
function TabbedFormTab({
  name,
  children,
  hidden,
}: TabbedFormTabProps & { hidden?: boolean }): ReactElement {
  return (
    <div
      data-chelone-tab={name}
      hidden={hidden}
      role="tabpanel"
      aria-hidden={hidden || undefined}
      id={`tabpanel-${name}`}
      aria-labelledby={`tabheader-${name}`}
    >
      <FormGroupProvider name={name}>{children}</FormGroupProvider>
    </div>
  );
}
(TabbedFormTab as TabMarker).chelName = TAB_MARKER;

/** Whether an element is a `<TabbedForm.Tab>` (by its static marker). */
function isTab(child: ReactNode): child is ReactElement<TabbedFormTabProps> {
  return (
    isValidElement(child) &&
    (child.type as TabMarker | undefined)?.chelName === TAB_MARKER
  );
}

/**
 * Flatten `children` into a flat node list, recursing through Fragments (a
 * top-level `<>…</>` is NOT flattened by `Children.toArray`, so authors who
 * group `<TabbedForm.Tab>`s in a Fragment — or a component returning one — are
 * handled). Mirrors ra-core's children-partition walk (plan §0a-9).
 */
function flattenChildren(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  for (const child of Children.toArray(children)) {
    if (isValidElement(child) && child.type === Fragment) {
      out.push(
        ...flattenChildren((child.props as { children?: ReactNode }).children),
      );
    } else {
      out.push(child);
    }
  }
  return out;
}

/** Extract the ordered tab descriptors from `<TabbedForm.Tab>` children. */
function collectTabs(children: ReactNode): TabDescriptor[] {
  const tabs: TabDescriptor[] = [];
  let index = 0;
  for (const child of flattenChildren(children)) {
    if (!isTab(child)) continue;
    const props = child.props;
    tabs.push({
      name: props.name,
      label: props.label ?? props.name,
      path: tabFullPath(props, index),
    });
    index += 1;
  }
  return tabs;
}

/**
 * The base pathname a URL-synced TabbedForm's tabs resolve against: the current
 * pathname MINUS the parent route's `*` remainder (ra's `useSplatPathBase`).
 * Mounted under `/posts/1/*` at `/posts/1/two`, the splat is `two` and the base
 * is `/posts/1`; at `/posts/1` the splat is `''` and the base is `/posts/1`.
 */
function useSplatPathBase(): string {
  const location = useLocation();
  const params = useParams();
  const splat = params["*"] ?? "";
  if (splat === "") return location.pathname;
  // Strip a trailing `/<splat>` (guard the regex-significant chars in `splat`).
  const suffix = `/${splat}`;
  return location.pathname.endsWith(suffix)
    ? location.pathname.slice(0, location.pathname.length - suffix.length)
    : location.pathname;
}

/** The absolute path a tab links to (`base` for the index tab, else `base/seg`). */
function tabHref(base: string, path: string): string {
  return path === "" ? base : `${base}/${path}`;
}

export interface TabbedFormProps<TFormData> extends UseFormOptions<TFormData> {
  /**
   * Sync the active tab with the URL (default `true`): each tab is a nested
   * route (deep-linkable, back-button aware). `false` → a local `useState` tab.
   */
  syncWithLocation?: boolean;
  /** `<TabbedForm.Tab>` elements (and any non-tab chrome — badges, toolbars). */
  children: ReactNode;
}

interface TabbedFormComponent {
  <TFormData>(props: TabbedFormProps<TFormData>): ReactElement;
  /** The tab slot: `<TabbedForm.Tab name label>`. */
  Tab: typeof TabbedFormTab;
}

/**
 * A tabbed form. Provide `<TabbedForm.Tab name label>` children (in order); a
 * single `save` (via {@link UseFormOptions}) submits the whole form. Wires the
 * ambient form + FormGroups registry, then either the URL-synced or the local
 * shell per `syncWithLocation`.
 */
function TabbedFormImpl<TFormData>({
  children,
  syncWithLocation = true,
  ...formOptions
}: TabbedFormProps<TFormData>): ReactElement {
  const { form, submit } = useForm<TFormData>(formOptions);
  const tabs = useMemo(() => collectTabs(children), [children]);
  return (
    <CheloneFormProvider form={form} submit={submit}>
      <FormGroupsProvider>
        {syncWithLocation ? (
          <UrlSyncedShell tabs={tabs} submit={submit}>
            {children}
          </UrlSyncedShell>
        ) : (
          <LocalShell tabs={tabs} submit={submit}>
            {children}
          </LocalShell>
        )}
      </FormGroupsProvider>
    </CheloneFormProvider>
  );
}

interface ShellProps {
  tabs: TabDescriptor[];
  submit: () => Promise<void>;
  children: ReactNode;
}

/**
 * Render the always-mounted tab PANELS — every `<TabbedForm.Tab>` child, with
 * `hidden` injected by `isActive`. Non-tab children (badges, toolbars) pass
 * through untouched, so a header row / validity badges rendered alongside the
 * tabs keep working.
 */
function renderPanels(
  children: ReactNode,
  isActive: (name: string) => boolean,
): ReactNode {
  // `flattenChildren` runs `Children.toArray`, which already assigns stable
  // positional keys to every child — so the non-tab chrome (badges/toolbars)
  // returned as-is stays correctly keyed, and only the tab panels need an
  // explicit stable `key` (the tab name).
  return flattenChildren(children).map((child) => {
    if (!isTab(child)) return child;
    const props = child.props;
    return (
      <TabbedFormTab
        {...props}
        hidden={!isActive(props.name)}
        key={props.name}
      />
    );
  });
}

/** The clickable tab header (validity dot + label). Shape-neutral between modes. */
interface TabHeaderProps {
  tab: TabDescriptor;
  active: boolean;
  /** URL-synced → an absolute link target; local → `undefined` (button). */
  href?: string;
  onSelect(): void;
}

function TabHeader({ tab, active, href, onSelect }: TabHeaderProps) {
  const { Link } = useRouterAdapter();
  const group = useFormGroup(tab.name);
  const label = (
    <>
      {tab.label}
      {group.isValid ? null : (
        <span data-chelone-tab-error={tab.name} aria-hidden="true">
          {" "}
          •
        </span>
      )}
    </>
  );
  const common = {
    role: "tab" as const,
    "aria-selected": active,
    "aria-controls": `tabpanel-${tab.name}`,
    id: `tabheader-${tab.name}`,
    "data-chelone-tab-header": tab.name,
    "data-active": active || undefined,
  };
  if (href !== undefined) {
    return (
      <Link to={href} {...common}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onSelect} {...common}>
      {label}
    </button>
  );
}

/**
 * The URL-synced shell: active tab derived from the location + splat base via
 * the adapter's `matchPath`. Headers render inside a `<Routes><Route path="/*"/>`
 * (ra parity: the relative-routing context) as `Link`s to each tab's absolute
 * path; panels render outside it (all mounted, hidden by the same match).
 */
function UrlSyncedShell({ tabs, submit, children }: ShellProps) {
  const { Routes, Route, matchPath } = useRouterAdapter();
  const navigate = useTabbedNavigate();
  const location = useLocation();
  const splatBase = useSplatPathBase();

  const matchTab = useCallback(
    (path: string): PathMatch | null =>
      matchPath(tabHref(splatBase, path), location.pathname),
    [matchPath, splatBase, location.pathname],
  );

  const isActive = useCallback(
    (name: string): boolean => {
      const tab = tabs.find((t) => t.name === name);
      return tab != null && matchTab(tab.path) != null;
    },
    [tabs, matchTab],
  );

  // The active tab name: the matched tab, else the first (the index tab).
  const activeTab =
    tabs.find((t) => matchTab(t.path) != null)?.name ?? tabs[0]?.name ?? "";

  const goToTab = useCallback(
    (name: string): void => {
      const tab = tabs.find((t) => t.name === name);
      if (!tab) return;
      navigate(tabHref(splatBase, tab.path));
    },
    [tabs, splatBase, navigate],
  );

  const controller = useMemo<UseTabbedFormResult>(
    () => ({ activeTab, syncWithLocation: true, goToTab, submit }),
    [activeTab, goToTab, submit],
  );

  const headers = (
    <div role="tablist" data-chelone-tablist>
      {tabs.map((tab) => (
        <TabHeader
          key={tab.name}
          tab={tab}
          active={isActive(tab.name)}
          href={tabHref(splatBase, tab.path)}
          onSelect={() => goToTab(tab.name)}
        />
      ))}
    </div>
  );

  return (
    <TabbedFormContext.Provider value={controller}>
      <Routes>
        <Route path="/*" element={headers} />
      </Routes>
      {renderPanels(children, isActive)}
    </TabbedFormContext.Provider>
  );
}

/** A ref-stable navigator (via the adapter) for tab-link clicks. */
function useTabbedNavigate(): (to: string) => void {
  const navigate = useRouterAdapter().useNavigate();
  return useCallback((to: string) => navigate(to), [navigate]);
}

/**
 * The local shell: a plain `useState` active tab. Headers are buttons; no router
 * is consulted. Panels are still all mounted (hidden by the active index).
 */
function LocalShell({ tabs, submit, children }: ShellProps) {
  const [activeTab, setActiveTab] = useState<string>(() => tabs[0]?.name ?? "");

  const goToTab = useCallback(
    (name: string): void => {
      if (tabs.some((t) => t.name === name)) setActiveTab(name);
    },
    [tabs],
  );

  const isActive = useCallback(
    (name: string): boolean => name === activeTab,
    [activeTab],
  );

  const controller = useMemo<UseTabbedFormResult>(
    () => ({ activeTab, syncWithLocation: false, goToTab, submit }),
    [activeTab, goToTab, submit],
  );

  const headers = (
    <div role="tablist" data-chelone-tablist>
      {tabs.map((tab) => (
        <TabHeader
          key={tab.name}
          tab={tab}
          active={tab.name === activeTab}
          onSelect={() => goToTab(tab.name)}
        />
      ))}
    </div>
  );

  return (
    <TabbedFormContext.Provider value={controller}>
      {headers}
      {renderPanels(children, isActive)}
    </TabbedFormContext.Provider>
  );
}

export const TabbedForm = TabbedFormImpl as TabbedFormComponent;
TabbedForm.Tab = TabbedFormTab;
