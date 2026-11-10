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
 * Deletes one post from the process-wide provider. `/rsc/posts` passes it to
 * `ServerListDeleteButton`, which revalidates the route once it resolves, so
 * the next server render no longer holds the row.
 */
export const deletePost = createServerFn({ method: "POST" })
  .validator((id: Identifier) => id)
  .handler(async ({ data: id }) => {
    await serverDataProvider.delete("posts", { id });
  });
