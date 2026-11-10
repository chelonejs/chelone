/**
 * The data provider server functions read. Unlike the one `getRouter()` builds
 * per request, this one lives as long as the server process, so a write made
 * through a server function shows in the next server render.
 */

import { fakeDataProvider, type Identifier } from "@chelone/core";
import { seedData } from "@chelone/demo-data";
import { createServerFn } from "@tanstack/react-start";
import type { StartDemoResources } from "./resources";

export const serverDataProvider = fakeDataProvider<StartDemoResources>(
  seedData(),
);

/**
 * The post `/rsc/posts/$id` shows, or undefined when `rawId` names no row. The
 * id arrives as a path string, so it is read here rather than validated on the
 * way in: a validator that rejects `abc` before the handler runs answers an
 * unknown post with an error page instead of the router's 404.
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

/**
 * Deletes one post from the process-wide provider. `/rsc/posts` passes it to
 * `ServerListDeleteButton`, which revalidates the route once it resolves, so
 * the next server render no longer holds the row.
 */
export const deletePost = createServerFn({ method: "POST" })
  .validator((id: Identifier) => id)
  .handler(async ({ data: id }) => {
    await serverDataProvider.delete("posts", { id });
  });
