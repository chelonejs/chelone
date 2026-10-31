import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useState,
} from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useSplatPathBase } from "../../../form/use-splat-path-base";
import { useTranslate } from "../../../i18n-hooks";
import { useRecordContext } from "../../../record/record-context";
import { useLocation, useNavigate } from "../../../router";
import { useRouterAdapter } from "../../../router/adapter";
import { Labeled } from "./labeled";

const TAB_MARKER = "ShowTab";

interface TabMarker {
  chelName?: string;
}

interface ShowTabProps {
  /** The tab label. Translated with itself as the fallback. */
  label: string;
  /**
   * The URL segment under the show route. Defaults to the tab's index for
   * every tab after the first, and `""` (the show route itself) for the first.
   */
  path?: string;
  /** Shown before the label. */
  icon?: ReactNode;
  /** Shown after the label as `(count)`. */
  count?: number;
  /** Class names for the element wrapping this tab's fields. */
  contentClassName?: string;
  /** The fields to show. Each element is wrapped in a `<Labeled>`. */
  children?: ReactNode;
}

/**
 * One tab of a `<TabbedShowLayout>`. The layout reads its props and renders the
 * tab itself, so this renders only its children when used on its own.
 */
function ShowTab({ children }: ShowTabProps): ReactElement {
  return <>{children}</>;
}
(ShowTab as TabMarker).chelName = TAB_MARKER;

/** What a tab list needs to draw one tab. */
interface TabbedShowLayoutTabDescriptor {
  /** The tab's URL segment, also its value inside `Tabs`. */
  value: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabbedShowLayoutTabsListProps {
  /** Filled in by `<TabbedShowLayout>`. */
  tabs?: TabbedShowLayoutTabDescriptor[];
  className?: string;
}

/**
 * The default tab list of a `<TabbedShowLayout>`. Pass `tabs` there to replace
 * it; a custom list receives the same `tabs` prop and can render this inside.
 */
function TabbedShowLayoutTabsList({
  tabs = [],
  className,
}: TabbedShowLayoutTabsListProps): ReactElement {
  const translate = useTranslate();
  return (
    <TabsList className={className}>
      {tabs.map((tab) => (
        <TabsTrigger key={tab.value} value={tab.value}>
          {tab.icon}
          <span>
            {translate(tab.label, { _: tab.label })}
            {tab.count != null ? ` (${tab.count})` : null}
          </span>
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

interface TabbedShowLayoutProps {
  /** `<TabbedShowLayout.Tab>` elements, directly or inside Fragments. */
  children?: ReactNode;
  className?: string;
  /** The gap between a tab's fields, in units of 4px. Defaults to 4. */
  spacing?: number;
  /** Rendered between a tab's fields, not after the last. */
  divider?: ReactNode;
  /** Replaces the default `<TabbedShowLayoutTabsList>`. */
  tabs?: ReactElement;
  /**
   * Follow the URL (default `true`): the active tab comes from the location
   * under the show route and a change navigates there, keeping the query
   * string. `false` keeps the active tab in local state.
   */
  syncWithLocation?: boolean;
  /** The active tab's URL segment. Overrides both modes. */
  value?: string;
}

function isShowTab(child: ReactNode): child is ReactElement<ShowTabProps> {
  return (
    isValidElement(child) &&
    (child.type as TabMarker | undefined)?.chelName === TAB_MARKER
  );
}

/** Flattens Fragments, which `Children.toArray` leaves in place. */
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

function tabHref(base: string, segment: string): string {
  return segment === "" ? base : `${base}/${segment}`;
}

/**
 * Groups a show view's fields into tabs, each field labeled from its `source`.
 * Renders nothing until the record context has a record.
 *
 * @example
 * <Show>
 *   <TabbedShowLayout>
 *     <TabbedShowLayout.Tab label="Summary">
 *       <TextField source="title" />
 *     </TabbedShowLayout.Tab>
 *     <TabbedShowLayout.Tab label="Body">
 *       <TextField source="body" />
 *     </TabbedShowLayout.Tab>
 *   </TabbedShowLayout>
 * </Show>
 */
function TabbedShowLayoutImpl({
  children,
  className,
  spacing = 4,
  divider,
  tabs = <TabbedShowLayoutTabsList />,
  syncWithLocation = true,
  value,
}: TabbedShowLayoutProps): ReactElement | null {
  const record = useRecordContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { matchPath } = useRouterAdapter();
  // The shared hook returns the pathname as is when the splat is empty, so a
  // show URL ending in `/` would build tab paths like `/posts/1/show//1`.
  const splatBase = useSplatPathBase().replace(/\/+$/, "");

  const tabElements = flattenChildren(children).filter(isShowTab);
  const segments = tabElements.map((tab, index) =>
    tab.props.path != null ? tab.props.path : index > 0 ? String(index) : "",
  );
  const [localValue, setLocalValue] = useState(segments[0] ?? "");

  if (!record) return null;

  const requested =
    value ??
    (syncWithLocation
      ? segments.find(
          (segment) =>
            matchPath(tabHref(splatBase, segment), location.pathname) != null,
        )
      : localValue);
  const active = segments.includes(requested ?? "")
    ? (requested as string)
    : (segments[0] ?? "");

  const descriptors = tabElements.map(
    ({ props }, index): TabbedShowLayoutTabDescriptor => ({
      value: segments[index] as string,
      label: props.label,
      icon: props.icon,
      count: props.count,
    }),
  );

  const onValueChange = (next: string) => {
    if (syncWithLocation) {
      navigate(`${tabHref(splatBase, next)}${location.search}`);
    } else {
      setLocalValue(next);
    }
  };

  return (
    <Tabs value={active} onValueChange={onValueChange} className={className}>
      {cloneElement(tabs as ReactElement<{ tabs: unknown }>, {
        tabs: descriptors,
      })}
      {tabElements.map((tab, index) => (
        <TabsContent key={segments[index]} value={segments[index] as string}>
          <div
            className={cn("flex flex-col", tab.props.contentClassName)}
            style={{ gap: spacing * 4 }}
          >
            {Children.toArray(tab.props.children)
              .filter(isValidElement)
              .map((field, fieldIndex) => (
                <Fragment key={field.key}>
                  {fieldIndex > 0 ? divider : null}
                  <Labeled>{field}</Labeled>
                </Fragment>
              ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

interface TabbedShowLayoutComponent {
  (props: TabbedShowLayoutProps): ReactElement | null;
  /** The tab slot: `<TabbedShowLayout.Tab label>`. */
  Tab: typeof ShowTab;
}

const TabbedShowLayout = TabbedShowLayoutImpl as TabbedShowLayoutComponent;
TabbedShowLayout.Tab = ShowTab;

export {
  ShowTab,
  type ShowTabProps,
  TabbedShowLayout,
  type TabbedShowLayoutProps,
  type TabbedShowLayoutTabDescriptor,
  TabbedShowLayoutTabsList,
  type TabbedShowLayoutTabsListProps,
};
