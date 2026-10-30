import type { ResourceMap } from "../resource/registry";
import type { DataProvider } from "./types";

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
  const providerFor = (resource: keyof TResources & string) => {
    const provider = matcher(resource);
    if (!provider) {
      throw new Error(
        `combineDataProviders: no data provider matches resource "${resource}"`,
      );
    }
    return provider;
  };

  // Spelled out verb by verb: the compiler then fails if `DataProvider` gains
  // a verb, and every verb is async so a throwing matcher rejects.
  return {
    getList: async (resource, params) =>
      providerFor(resource).getList(resource, params),
    getOne: async (resource, params) =>
      providerFor(resource).getOne(resource, params),
    create: async (resource, params) =>
      providerFor(resource).create(resource, params),
    update: async (resource, params) =>
      providerFor(resource).update(resource, params),
    delete: async (resource, params) =>
      providerFor(resource).delete(resource, params),
    getMany: async (resource, params) =>
      providerFor(resource).getMany(resource, params),
    getManyReference: async (resource, params) =>
      providerFor(resource).getManyReference(resource, params),
    updateMany: async (resource, params) =>
      providerFor(resource).updateMany(resource, params),
    deleteMany: async (resource, params) =>
      providerFor(resource).deleteMany(resource, params),
  };
}
