/**
 * The framework a docs page shows: `?framework=vue` first, then the choice kept
 * in local storage, then React. Every component that calls this reads the same
 * value, so one switch moves the whole page.
 */
import { useCallback, useSyncExternalStore } from "react";
import { useSearchParams } from "react-router";

export type Framework = "react" | "vue";

export const FRAMEWORKS: { key: Framework; label: string }[] = [
  { key: "react", label: "React" },
  { key: "vue", label: "Vue" },
];

const STORAGE_KEY = "chelone-docs-framework";

function isFramework(value: string | null): value is Framework {
  return value === "react" || value === "vue";
}

function readStored(): Framework | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isFramework(stored) ? stored : null;
  } catch {
    return null;
  }
}

// `storage` only fires in other tabs, so a switch in this one notifies here.
const listeners = new Set<() => void>();

function subscribeNever() {
  return () => {};
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useFramework(): [Framework, (next: Framework) => void] {
  const [params, setParams] = useSearchParams();
  // The prerendered HTML has no query string and no storage, so it shows React.
  // Both the URL and storage wait for hydration, or the first client render
  // would differ from that HTML and React would discard it.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const stored = useSyncExternalStore(subscribe, readStored, () => null);
  const fromUrl = params.get("framework");
  const framework = !hydrated
    ? "react"
    : isFramework(fromUrl)
      ? fromUrl
      : (stored ?? "react");
  const hasUrlChoice = params.has("framework");

  const setFramework = useCallback(
    (next: Framework) => {
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage is blocked, so the choice is not kept.
      }
      for (const listener of listeners) listener();
      // A `?framework=` in the URL outranks storage, so move it with the choice.
      if (hasUrlChoice) {
        setParams(
          (current) => {
            const updated = new URLSearchParams(current);
            updated.set("framework", next);
            return updated;
          },
          { replace: true, preventScrollReset: true },
        );
      }
    },
    [hasUrlChoice, setParams],
  );

  return [framework, setFramework];
}
