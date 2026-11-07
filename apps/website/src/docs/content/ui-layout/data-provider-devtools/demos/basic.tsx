import { createDataProviderLog, fakeDataProvider } from "@chelone/core";
import { DataProviderDevtools } from "@chelone/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** A provider of its own, so the panel has calls to list whatever the page does. */
function makeLoggedProvider() {
  const log = createDataProviderLog();
  const dataProvider = log.wrap(
    fakeDataProvider({
      posts: [
        { id: 1, title: "On Computable Numbers" },
        { id: 2, title: "Analytical Engines Explained" },
      ],
    }),
  );
  return { log, dataProvider };
}

/**
 * `<DataProviderDevtools>` is fixed to the viewport. The transform makes this
 * box its containing block, so the panel stays inside the preview.
 */
export default function DataProviderDevtoolsDemo() {
  const [{ log, dataProvider }] = useState(makeLoggedProvider);
  const load = () =>
    dataProvider.getList("posts", {
      pagination: { page: 1, perPage: 10 },
      sort: { field: "id", order: "ASC" },
      filter: {},
    });
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="relative h-96 w-full max-w-xl transform-gpu overflow-hidden rounded-md border">
      <div className="p-4">
        <Button size="sm" onClick={load}>
          Load posts
        </Button>
      </div>
      <DataProviderDevtools log={log} className="right-2 bottom-2" />
    </div>
  );
}
