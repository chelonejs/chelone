// A subpath entry, not part of the barrel: the adapter imports the optional
// `@tanstack/react-router` peer, which the main entry must load without.
export {
  tanstackHostRouterAdapter,
  tanstackRouterAdapter,
} from "./router/tanstack-router-adapter";
