/**
 * The data provider the `/rsc` pages read. Unlike the one `server-context.ts`
 * builds per request for the admin's prefetch, this one lives as long as the
 * server process, so a write made through `rsc-actions.ts` shows in the next
 * server render.
 */

import { fakeDataProvider } from "@chelone/core";
import { seedData } from "@chelone/demo-data";
import type { NextDemoResources } from "./resources";

export const serverDataProvider = fakeDataProvider<NextDemoResources>(
  seedData(),
);

/**
 * The post `/rsc/posts/[id]` shows, or undefined when `rawId` names no row. The
 * id arrives as a path string, so it is read here rather than validated on the
 * way in: a validator that rejects `abc` before the page runs answers an
 * unknown post with an error page instead of Next's 404.
 */
export async function findPost(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id)) return undefined;
  try {
    return (await serverDataProvider.getOne("posts", { id })).data;
  } catch {
    return undefined;
  }
}
