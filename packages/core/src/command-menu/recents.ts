/** Where the command menu keeps its recents in a `CheloneStore`. */
export const recentsKey = "command-menu.recents";

/**
 * A page the user visited. It holds no `path`: the link is rebuilt from the
 * resource and id, so a basename change cannot strand a saved entry.
 */
export interface RecentEntry {
  type: "resource" | "record";
  resource: string;
  id?: string | number;
  label: string;
}

function sameEntry(a: RecentEntry, b: RecentEntry): boolean {
  return (
    a.type === b.type &&
    a.resource === b.resource &&
    (a.id === undefined ? undefined : String(a.id)) ===
      (b.id === undefined ? undefined : String(b.id))
  );
}

/** Puts `entry` first, drops an earlier copy, and cuts to `limit`. */
export function rememberRecent(
  recents: readonly RecentEntry[],
  entry: RecentEntry,
  limit: number,
): RecentEntry[] {
  if (limit < 1) return [];
  return [entry, ...recents.filter((other) => !sameEntry(other, entry))].slice(
    0,
    limit,
  );
}
