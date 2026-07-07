import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

// ── TabItem ──────────────────────────────────────────────────────────────────

interface TabItemProps {
  label: string;
  children: ReactNode;
}

/** Marker element — Tabs reads the `label` prop from this. */
export function TabItem({ children }: TabItemProps) {
  return <>{children}</>;
}

TabItem.displayName = "TabItem";

// ── Tabs ─────────────────────────────────────────────────────────────────────

interface TabsProps {
  children: ReactNode;
}

function isTabItem(node: ReactNode): node is ReactElement<TabItemProps> {
  return (
    isValidElement(node) &&
    (node.type as { displayName?: string }).displayName === "TabItem"
  );
}

export function Tabs({ children }: TabsProps) {
  const items = Children.toArray(children).filter(isTabItem);
  const [active, setActive] = useState(0);
  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (items.length === 0) return null;

  const handleKeyDown = (e: React.KeyboardEvent, i: number) => {
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % items.length;
    else if (e.key === "ArrowLeft")
      next = (i - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border/40">
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Code tabs"
        className="flex border-b border-border/30 bg-muted/30 overflow-x-auto"
      >
        {items.map((item, i) => {
          const label = (item.props as TabItemProps).label;
          const selected = i === active;
          return (
            <button
              key={label}
              id={`${uid}-tab-${i}`}
              role="tab"
              aria-selected={selected}
              aria-controls={`${uid}-panel-${i}`}
              tabIndex={selected ? 0 : -1}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              onClick={() => setActive(i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      {items.map((item, i) => (
        <div
          key={(item.props as TabItemProps).label}
          id={`${uid}-panel-${i}`}
          role="tabpanel"
          aria-labelledby={`${uid}-tab-${i}`}
          hidden={i !== active}
          className="p-0"
        >
          {item.props.children}
        </div>
      ))}
    </div>
  );
}

export default Tabs;
