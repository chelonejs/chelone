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
// A hash router leaves the query after a `?` inside the hash.
const searchString = ({ search, hash }: UrlLocation) => {
  if (search !== "") return search;
  const queryStart = hash.indexOf("?");
  return queryStart === -1 ? hash : hash.slice(queryStart + 1);
};

export function readSupabaseUrlParams(
  location: UrlLocation = window.location,
): SupabaseUrlParams {
  const params = new URLSearchParams(
    searchString(location).replace(/^[?#]/, ""),
  );
  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
    type: params.get("type"),
  };
}
