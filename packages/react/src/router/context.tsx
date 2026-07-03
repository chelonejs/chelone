/**
 * Router-layer React contexts: the injected `RouterAdapter` (re-exported from
 * `./adapter`) and the app `basename` (plan §0a-12).
 *
 * `BasenameContext` default is `''` (empty string): outside a host router the
 * adapter's `RouterWrapper` creates its own router and applies the basename
 * there, so link-building sees `''`; inside a host router the shell sets this
 * to the app basename so `createPath` prefixes it (plan §0a-12).
 */

import { createContext, type ReactNode, useContext } from "react";

export {
  type RouterAdapter,
  RouterAdapterContext,
  RouterAdapterProvider,
  type RouterAdapterProviderProps,
  useRouterAdapter,
} from "./adapter";

/** The app basename, default `''`. Consumed by `useBasename` / `useCreatePath`. */
export const BasenameContext = createContext<string>("");

export interface BasenameProviderProps {
  basename: string;
  children: ReactNode;
}

/** Provide the app basename to the subtree. */
export function BasenameProvider({
  basename,
  children,
}: BasenameProviderProps) {
  return (
    <BasenameContext.Provider value={basename}>
      {children}
    </BasenameContext.Provider>
  );
}

/** Read the app basename (default `''`). */
export function useBasename(): string {
  return useContext(BasenameContext);
}
