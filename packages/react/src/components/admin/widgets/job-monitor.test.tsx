/**
 * `<JobMonitor>`: polls a jobs resource and groups it by status in tabs. It
 * reads its own data, so the tests mount it under a provider with a fake data
 * provider and assert DOM, roles and data-provider calls.
 */
import {
  type AuthProvider,
  createNotificationStore,
  type DataProvider,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { ResourceContextProvider } from "../../../resource/resource-context";
import { JobMonitor } from "./job-monitor";

afterEach(cleanup);

const job = (over: LooseRecord): LooseRecord => ({
  type: "email",
  attempts: 1,
  createdAt: "2026-01-02T10:00:00.000Z",
  ...over,
});

/**
 * `fakeDataProvider` edits its stored records in place and `getList` hands them
 * out as they are, so a refetch would look unchanged to the query cache.
 * Cloning on the way out makes it behave like a server.
 */
function provider(jobs: LooseRecord[]): DataProvider {
  const inner = fakeDataProvider({ jobs: structuredClone(jobs) });
  const getList = inner.getList.bind(inner);
  inner.getList = async (...args) => structuredClone(await getList(...args));
  return inner;
}

const JOBS: LooseRecord[] = [
  job({ id: 1, status: "running", type: "import" }),
  job({ id: 2, status: "queued", type: "export" }),
  job({ id: 3, status: "queued", type: "email" }),
  job({
    id: 4,
    status: "failed",
    type: "sync",
    lastError: "boom",
    attempts: 3,
  }),
  job({ id: 5, status: "archived", type: "gc" }),
];

function setup({
  jobs = JOBS,
  monitor = {},
  dataProvider = provider(jobs),
  authProvider,
  wrap = (node: ReactNode) => node,
}: {
  jobs?: LooseRecord[];
  monitor?: ComponentProps<typeof JobMonitor>;
  dataProvider?: DataProvider;
  authProvider?: AuthProvider;
  wrap?: (node: ReactNode) => ReactNode;
} = {}) {
  const getList = vi.spyOn(dataProvider, "getList");
  const update = vi.spyOn(dataProvider, "update");
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  render(
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      notifications={notifications}
      authProvider={authProvider}
    >
      {wrap(<JobMonitor resource="jobs" {...monitor} />)}
    </CheloneProvider>,
  );
  return { getList, update, notify, dataProvider };
}

const slot = (name: string) =>
  document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const rows = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="job-monitor-row"]'),
  );
const rowAt = (index: number) => {
  const found = rows()[index];
  if (!found) throw new Error(`no row ${index}`);
  return found;
};
const rowIds = () => rows().map((row) => row.dataset.recordId);
const tab = (name: RegExp | string) => screen.getByRole("tab", { name });
const openTab = (name: RegExp) =>
  fireEvent.mouseDown(tab(name), { button: 0, ctrlKey: false });
const count = (name: RegExp) =>
  within(tab(name)).getByText(/^\d+$/).textContent;
const button = (slotName: string) => {
  const found = slot(slotName);
  if (!(found instanceof HTMLButtonElement)) throw new Error(`no ${slotName}`);
  return found;
};

const denyEdit = (): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  canAccess: vi.fn(async () => false),
});

describe("<JobMonitor>", () => {
  it("renders a tab per status with the count of its jobs", async () => {
    setup();
    await screen.findByRole("tablist");
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "running1",
      "queued2",
      "failed1",
      "done0",
    ]);
    expect(
      within(tab(/queued/))
        .getByText("2")
        .getAttribute("data-slot"),
    ).toBe("job-monitor-count");
    expect(slot("job-monitor")?.textContent).toContain("Jobs");
  });

  it("the first tab is active and lists its jobs", async () => {
    setup();
    await screen.findByRole("tablist");
    expect(tab(/running/).getAttribute("aria-selected")).toBe("true");
    expect(tab(/queued/).getAttribute("aria-selected")).toBe("false");
    expect(rowIds()).toEqual(["1"]);
    expect(rows()[0]?.textContent).toContain("import");
  });

  it("custom tabs replace the default ones", async () => {
    setup({ monitor: { tabs: ["queued", "archived"] } });
    await screen.findByRole("tablist");
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "queued2",
      "archived1",
    ]);
    expect(rowIds()).toEqual(["2", "3"]);
  });

  it("a job whose status has no tab is not shown", async () => {
    setup({ monitor: { tabs: ["queued", "failed", "archived"] } });
    await screen.findByRole("tablist");
    expect(screen.queryByText("(no type)")).toBeNull();
    const total = screen
      .getAllByRole("tab")
      .reduce((n, t) => n + Number(t.textContent?.replace(/\D/g, "")), 0);
    expect(total).toBe(4);
    await waitFor(() => expect(rowIds()).toEqual(["2", "3"]));
  });

  it("Retry on a failed job writes the retry status and the job moves to its new tab", async () => {
    const { update, notify } = setup();
    await screen.findByRole("tablist");
    openTab(/failed/);
    expect(button("job-monitor-retry").textContent).toBe("Retry");
    expect(slot("job-monitor-cancel")).toBeNull();

    fireEvent.click(button("job-monitor-retry"));

    await waitFor(() => expect(count(/failed/)).toBe("0"));
    expect(count(/queued/)).toBe("3");
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      "jobs",
      expect.objectContaining({
        id: 4,
        data: { status: "queued" },
        previousData: expect.objectContaining({ id: 4, status: "failed" }),
      }),
    );
    expect(notify).toHaveBeenCalledWith(
      "chelone.notification.updated",
      expect.objectContaining({ type: "info" }),
    );
  });

  it("disables the button while the write is pending", async () => {
    const dataProvider = provider(JOBS);
    const real = dataProvider.update.bind(dataProvider);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    dataProvider.update = async (...args) => {
      await gate;
      return real(...args);
    };
    setup({ dataProvider });
    await screen.findByRole("tablist");
    openTab(/failed/);

    fireEvent.click(button("job-monitor-retry"));

    await waitFor(() =>
      expect(button("job-monitor-retry").disabled).toBe(true),
    );
    // A pessimistic write leaves the job where it is until the server answers.
    expect(count(/failed/)).toBe("1");
    release();
    await waitFor(() => expect(count(/failed/)).toBe("0"));
  });

  it("Cancel on a running or queued job writes the cancel status", async () => {
    const { update } = setup();
    await screen.findByRole("tablist");
    expect(slot("job-monitor-retry")).toBeNull();
    expect(button("job-monitor-cancel").textContent).toBe("Cancel");

    fireEvent.click(button("job-monitor-cancel"));

    await waitFor(() => expect(count(/running/)).toBe("0"));
    expect(update).toHaveBeenCalledWith(
      "jobs",
      expect.objectContaining({ id: 1, data: { status: "cancelled" } }),
    );
    openTab(/queued/);
    expect(
      rows().every((row) =>
        row.querySelector("[data-slot=job-monitor-cancel]"),
      ),
    ).toBe(true);
  });

  it("a rejected write notifies an error and leaves the job in its tab", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { update, notify } = setup();
    update.mockRejectedValueOnce(new Error("nope"));
    await screen.findByRole("tablist");
    openTab(/failed/);

    fireEvent.click(button("job-monitor-retry"));

    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.objectContaining({ type: "error" }),
      ),
    );
    expect(count(/failed/)).toBe("1");
    expect(rowIds()).toEqual(["4"]);
    await waitFor(() =>
      expect(button("job-monitor-retry").disabled).toBe(false),
    );
    consoleError.mockRestore();
  });

  it("actions false or no edit access hides Retry and Cancel", async () => {
    setup({ monitor: { actions: false } });
    await screen.findByRole("tablist");
    expect(slot("job-monitor-cancel")).toBeNull();
    openTab(/failed/);
    expect(slot("job-monitor-retry")).toBeNull();
    cleanup();

    const authProvider = denyEdit();
    setup({ authProvider });
    await screen.findByRole("tablist");
    await waitFor(() => expect(authProvider.canAccess).toHaveBeenCalled());
    expect(slot("job-monitor-cancel")).toBeNull();
    openTab(/failed/);
    expect(slot("job-monitor-retry")).toBeNull();
  });

  it("shows the last error and toggles the payload", async () => {
    setup({
      jobs: [
        job({
          id: 1,
          status: "failed",
          lastError: "boom",
          payload: { to: "a@b.c" },
        }),
        job({ id: 2, status: "failed", type: undefined }),
      ],
      monitor: { tabs: ["failed"] },
    });
    await screen.findByRole("tablist");
    const first = rowAt(0);
    const second = rowAt(1);
    expect(
      first.querySelector("[data-slot=job-monitor-last-error]")?.textContent,
    ).toBe("boom");
    expect(
      second.querySelector("[data-slot=job-monitor-last-error]"),
    ).toBeNull();
    expect(second.textContent).toContain("(no type)");
    expect(
      within(second).queryByRole("button", {
        name: "Show payload",
      }),
    ).toBeNull();

    const toggle = within(first).getByRole("button", {
      name: "Show payload",
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(first.querySelector("pre")).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(first.querySelector("pre")?.textContent).toContain('"to": "a@b.c"');
    fireEvent.click(toggle);
    expect(first.querySelector("pre")).toBeNull();
  });

  it("polls getList every pollInterval ms, and not with pollInterval 0", async () => {
    const polling = setup({ monitor: { pollInterval: 30 } });
    await waitFor(() =>
      expect(polling.getList.mock.calls.length).toBeGreaterThanOrEqual(3),
    );
    expect(polling.getList).toHaveBeenCalledWith(
      "jobs",
      expect.objectContaining({
        pagination: { page: 1, perPage: 200 },
        sort: { field: "createdAt", order: "DESC" },
      }),
    );
    cleanup();

    const idle = setup({ monitor: { pollInterval: 0 } });
    await screen.findByRole("tablist");
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(idle.getList).toHaveBeenCalledTimes(1);
  });

  it("reads the resource from context when no resource prop is given", async () => {
    const { getList } = setup({
      monitor: { resource: undefined },
      wrap: (node) => (
        <ResourceContextProvider value="jobs">{node}</ResourceContextProvider>
      ),
    });
    await screen.findByRole("tablist");
    expect(getList).toHaveBeenCalledWith("jobs", expect.anything());
  });

  it("renders nothing with neither a resource prop nor a resource context", async () => {
    const { getList } = setup({ monitor: { resource: undefined } });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(slot("job-monitor")).toBeNull();
    expect(getList).not.toHaveBeenCalled();
  });

  it("shows an error line when getList fails", async () => {
    const dataProvider = fakeDataProvider({ jobs: [] });
    dataProvider.getList = async () => {
      throw new Error("down");
    };
    setup({ dataProvider });
    const error = await waitFor(() => {
      const found = slot("job-monitor-error");
      if (!found) throw new Error("no error line");
      return found;
    });
    expect(error.textContent).toBe("Server communication error");
  });

  it("renders a type, last error and payload that hold markup as text", async () => {
    setup({
      jobs: [
        job({
          id: 1,
          status: "failed",
          type: "<img src=x onerror=alert(1)>",
          lastError: "<script>alert(1)</script>",
          payload: {
            html: "<img src=x onerror=alert(1)><script>alert(2)</script>",
          },
        }),
      ],
      monitor: { tabs: ["failed"] },
    });
    await screen.findByRole("tablist");
    fireEvent.click(screen.getByRole("button", { name: "Show payload" }));

    const root = slot("job-monitor");
    expect(root?.querySelector("img, script")).toBeNull();
    expect(rows()[0]?.textContent).toContain("<img src=x onerror=alert(1)>");
    expect(slot("job-monitor-last-error")?.textContent).toBe(
      "<script>alert(1)</script>",
    );
    expect(root?.querySelector("pre")?.textContent).toContain(
      "<script>alert(2)</script>",
    );
  });
});
