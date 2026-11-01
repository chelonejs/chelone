export interface SupabaseUrlParams {
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
}

export interface UrlLocation {
  search: string;
  hash: string;
}

// Supabase puts the tokens in the query or, for the implicit flow, in the hash.
// The search can hold other params, so a key falls back through the places it
// can sit: the search, the query inside a hash route (`#/route?key=...`), and
// whatever follows the last `#` (`#key=...` or `#/route#key=...`).
const sources = ({ search, hash }: UrlLocation) => {
  const queryStart = hash.indexOf("?");
  return [
    search,
    queryStart === -1 ? "" : hash.slice(queryStart + 1),
    hash.slice(hash.lastIndexOf("#") + 1),
  ].map((source) => new URLSearchParams(source));
};

export function readSupabaseUrlParams(
  location: UrlLocation = window.location,
): SupabaseUrlParams {
  const found = sources(location);
  const read = (key: string) => {
    for (const params of found) {
      const value = params.get(key);
      if (value !== null) return value;
    }
    return null;
  };
  return {
    accessToken: read("access_token"),
    refreshToken: read("refresh_token"),
    type: read("type"),
  };
}
