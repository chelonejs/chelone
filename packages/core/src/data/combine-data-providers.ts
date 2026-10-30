import type { ResourceMap } from "../resource/registry";
import type { DataProvider } from "./types";

const VERBS = [
  "getList",
  "getOne",
  "create",
  "update",
  "delete",
  "getMany",
  "getManyReference",
  "updateMany",
  "deleteMany",
] as const;

type LooseVerb = (resource: string, params: unknown) => Promise<unknown>;

/**
 * One provider for an app whose resources live in different backends.
 * `matcher` runs on every call (nothing is cached, so routing can change at
 * run time) and picks the provider that gets `(resource, params)`. A matcher
 * that returns nothing or throws rejects the call, and only the nine verbs of
 * the chosen provider are used.
 */
export function combineDataProviders<
  TResources extends ResourceMap = ResourceMap,
>(
  matcher: (
    resource: keyof TResources & string,
  ) => DataProvider<TResources> | undefined | null,
): DataProvider<TResources> {
  const combined: Record<string, LooseVerb> = {};

  for (const verb of VERBS) {
    combined[verb] = async (resource, params) => {
      const provider = matcher(resource as keyof TResources & string);
      if (!provider) {
        throw new Error(
          `combineDataProviders: no data provider matches resource "${resource}"`,
        );
      }
      return (provider as unknown as Record<typeof verb, LooseVerb>)[verb](
        resource,
        params,
      );
    };
  }

  return combined as unknown as DataProvider<TResources>;
}
