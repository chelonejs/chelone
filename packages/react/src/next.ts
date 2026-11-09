// A subpath entry, not part of the barrel: the adapter imports the optional
// `next` peer, which the main entry must load without.
export type { NextOutletProviderProps } from "./router/next-router-adapter";
export {
  NextOutletProvider,
  nextRouterAdapter,
} from "./router/next-router-adapter";
