import { fakeDataProvider } from "@chelone/core";
import { CheloneProvider, JobMonitor, useCheloneContext } from "@chelone/react";
import { type ReactNode, useState } from "react";

const MINUTE = 60_000;
const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * MINUTE).toISOString();

function makeJobs() {
  return fakeDataProvider({
    jobs: [
      {
        id: 101,
        status: "running",
        type: "import-products",
        attempts: 1,
        createdAt: minutesAgo(4),
        payload: { source: "catalog.csv", rows: 1200 },
      },
      {
        id: 102,
        status: "queued",
        type: "send-digest",
        attempts: 0,
        createdAt: minutesAgo(2),
      },
      {
        id: 103,
        status: "failed",
        type: "export-orders",
        attempts: 3,
        createdAt: minutesAgo(35),
        lastError: "Connection to the warehouse timed out",
        payload: { format: "csv", range: "last-30-days" },
      },
      {
        id: 104,
        status: "done",
        type: "rebuild-index",
        attempts: 1,
        createdAt: minutesAgo(90),
      },
    ],
  });
}

/** The preview only holds posts, so this adds a data provider with a `jobs` resource. */
function WithJobs({ children }: { children: ReactNode }) {
  const { queryClient, store, i18n, notifications, authProvider } =
    useCheloneContext();
  const [dataProvider] = useState(makeJobs);
  return (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      store={store}
      i18n={i18n}
      notifications={notifications}
      authProvider={authProvider}
    >
      {children}
    </CheloneProvider>
  );
}

/** `<JobMonitor>` has a tab per status. Retry re-queues the failed job and Cancel stops the running one. */
export default function JobMonitorDemo() {
  return (
    <WithJobs>
      <JobMonitor resource="jobs" className="w-full max-w-2xl" />
    </WithJobs>
  );
}
