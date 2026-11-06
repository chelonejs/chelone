/**
 * `<JobMonitor>`: polls a jobs resource and groups it by status in tabs. It
 * reads its own data, so the tests mount it under `<Admin>` over a fake data
 * provider and assert DOM, roles and data-provider calls.
 */
import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  type DataProvider,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, provide } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { ResourceContextKey } from "../../../resource-context";
import JobMonitor, { type JobMonitorProps } from "./job-monitor.vue";

// A mapped type has the index signature `h` wants, which the interface lacks.
type MonitorProps = { [K in keyof JobMonitorProps]: JobMonitorProps[K] };

const mounted: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  vi.restoreAllMocks();
});

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

async function setup({
  jobs = JOBS,
  monitor = {},
  dataProvider = provider(jobs),
  authProvider,
  inContext = false,
}: {
  jobs?: LooseRecord[];
  monitor?: MonitorProps;
  dataProvider?: DataProvider;
  authProvider?: AuthProvider;
  /** Provide `jobs` as the resource context instead of a `resource` prop. */
  inContext?: boolean;
} = {}) {
  const getList = vi.spyOn(dataProvider, "getList");
  const update = vi.spyOn(dataProvider, "update");
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const InContext = defineComponent({
    setup(_props, { slots }) {
      provide(ResourceContextKey, "jobs");
      return () => slots.default?.();
    },
  });
  const monitorNode = () =>
    h(JobMonitor, inContext ? monitor : { resource: "jobs", ...monitor });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        {
          dataProvider,
          authProvider,
          queryClient,
          notifications,
          i18n: createI18n({ locale: "en", messages: { en: {} } }),
        },
        {
          default: () =>
            inContext
              ? h(InContext, null, { default: monitorNode })
              : monitorNode(),
          layout: () => h("div"),
        },
      ),
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  await flushPromises();
  return { wrapper, getList, update, notify, dataProvider };
}

type Wrapper = VueWrapper;

const slot = (wrapper: Wrapper, name: string) =>
  wrapper.find(`[data-slot="${name}"]`);
const rows = (wrapper: Wrapper) =>
  wrapper.findAll('[data-slot="job-monitor-row"]');
const rowIds = (wrapper: Wrapper) =>
  rows(wrapper).map((row) => row.attributes("data-record-id"));
const tabs = (wrapper: Wrapper) => wrapper.findAll('[role="tab"]');
const tab = (wrapper: Wrapper, name: RegExp) => {
  const found = tabs(wrapper).find((t) => name.test(t.text()));
  if (!found) throw new Error(`no tab ${name}`);
  return found;
};
const openTab = (wrapper: Wrapper, name: RegExp) =>
  tab(wrapper, name).trigger("click");
const count = (wrapper: Wrapper, name: RegExp) =>
  tab(wrapper, name).get('[data-slot="job-monitor-count"]').text();
const ready = (wrapper: Wrapper) =>
  vi.waitFor(() =>
    expect(wrapper.find('[role="tablist"]').exists()).toBe(true),
  );

const denyEdit = (): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  canAccess: vi.fn(async () => false),
});

describe("<JobMonitor>", () => {
  it("renders a tab per status with the count of its jobs", async () => {
    const { wrapper } = await setup();
    await ready(wrapper);
    expect(tabs(wrapper).map((t) => t.text())).toEqual([
      "running 1",
      "queued 2",
      "failed 1",
      "done 0",
    ]);
    expect(count(wrapper, /queued/)).toBe("2");
    expect(slot(wrapper, "job-monitor").text()).toContain("Jobs");
  });

  it("the first tab is active and lists its jobs", async () => {
    const { wrapper } = await setup();
    await ready(wrapper);
    expect(tab(wrapper, /running/).attributes("aria-selected")).toBe("true");
    expect(tab(wrapper, /queued/).attributes("aria-selected")).toBe("false");
    expect(rowIds(wrapper)).toEqual(["1"]);
    expect(rows(wrapper)[0]?.text()).toContain("import");
  });

  it("custom tabs replace the default ones", async () => {
    const { wrapper } = await setup({
      monitor: { tabs: ["queued", "archived"] },
    });
    await ready(wrapper);
    expect(tabs(wrapper).map((t) => t.text())).toEqual([
      "queued 2",
      "archived 1",
    ]);
    expect(rowIds(wrapper)).toEqual(["2", "3"]);
  });

  it("a job whose status has no tab is not shown", async () => {
    const { wrapper } = await setup({
      monitor: { tabs: ["queued", "failed", "archived"] },
    });
    await ready(wrapper);
    expect(wrapper.text()).not.toContain("(no type)");
    const total = tabs(wrapper).reduce(
      (n, t) => n + Number(t.text().replace(/\D/g, "")),
      0,
    );
    expect(total).toBe(4);
    await vi.waitFor(() => expect(rowIds(wrapper)).toEqual(["2", "3"]));
  });

  it("Retry on a failed job writes the retry status and the job moves to its new tab", async () => {
    const { wrapper, update, notify } = await setup();
    await ready(wrapper);
    await openTab(wrapper, /failed/);
    expect(slot(wrapper, "job-monitor-retry").text()).toBe("Retry");
    expect(slot(wrapper, "job-monitor-cancel").exists()).toBe(false);

    await slot(wrapper, "job-monitor-retry").trigger("click");

    await vi.waitFor(() => expect(count(wrapper, /failed/)).toBe("0"));
    expect(count(wrapper, /queued/)).toBe("3");
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
    const { wrapper } = await setup({ dataProvider });
    await ready(wrapper);
    await openTab(wrapper, /failed/);

    await slot(wrapper, "job-monitor-retry").trigger("click");

    await vi.waitFor(() =>
      expect(
        slot(wrapper, "job-monitor-retry").attributes("disabled"),
      ).toBeDefined(),
    );
    // A pessimistic write leaves the job where it is until the server answers.
    expect(count(wrapper, /failed/)).toBe("1");
    release();
    await vi.waitFor(() => expect(count(wrapper, /failed/)).toBe("0"));
  });

  it("Cancel on a running or queued job writes the cancel status", async () => {
    const { wrapper, update } = await setup();
    await ready(wrapper);
    expect(slot(wrapper, "job-monitor-retry").exists()).toBe(false);
    expect(slot(wrapper, "job-monitor-cancel").text()).toBe("Cancel");

    await slot(wrapper, "job-monitor-cancel").trigger("click");

    await vi.waitFor(() => expect(count(wrapper, /running/)).toBe("0"));
    expect(update).toHaveBeenCalledWith(
      "jobs",
      expect.objectContaining({ id: 1, data: { status: "cancelled" } }),
    );
    await openTab(wrapper, /queued/);
    expect(
      rows(wrapper).every((row) =>
        row.find("[data-slot=job-monitor-cancel]").exists(),
      ),
    ).toBe(true);
  });

  it("a rejected write notifies an error and leaves the job in its tab", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { wrapper, update, notify } = await setup();
    update.mockRejectedValueOnce(new Error("nope"));
    await ready(wrapper);
    await openTab(wrapper, /failed/);

    await slot(wrapper, "job-monitor-retry").trigger("click");

    await vi.waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.objectContaining({ type: "error" }),
      ),
    );
    expect(count(wrapper, /failed/)).toBe("1");
    expect(rowIds(wrapper)).toEqual(["4"]);
    await vi.waitFor(() =>
      expect(
        slot(wrapper, "job-monitor-retry").attributes("disabled"),
      ).toBeUndefined(),
    );
  });

  it("a rejected write still notifies when its tab was left before the answer", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const dataProvider = provider(JOBS);
    let fail: (error: Error) => void = () => {};
    dataProvider.update = () =>
      new Promise((_resolve, reject) => {
        fail = reject;
      });
    const { wrapper, notify } = await setup({ dataProvider });
    await ready(wrapper);
    await openTab(wrapper, /failed/);
    await slot(wrapper, "job-monitor-retry").trigger("click");
    await vi.waitFor(() =>
      expect(
        slot(wrapper, "job-monitor-retry").attributes("disabled"),
      ).toBeDefined(),
    );

    await openTab(wrapper, /queued/);
    expect(slot(wrapper, "job-monitor-retry").exists()).toBe(false);
    fail(new Error("nope"));

    await vi.waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.objectContaining({ type: "error" }),
      ),
    );
  });

  it("actions false or no edit access hides Retry and Cancel", async () => {
    const off = await setup({ monitor: { actions: false } });
    await ready(off.wrapper);
    expect(slot(off.wrapper, "job-monitor-cancel").exists()).toBe(false);
    await openTab(off.wrapper, /failed/);
    expect(slot(off.wrapper, "job-monitor-retry").exists()).toBe(false);
    off.wrapper.unmount();

    const authProvider = denyEdit();
    const denied = await setup({ authProvider });
    await ready(denied.wrapper);
    await vi.waitFor(() => expect(authProvider.canAccess).toHaveBeenCalled());
    expect(slot(denied.wrapper, "job-monitor-cancel").exists()).toBe(false);
    await openTab(denied.wrapper, /failed/);
    expect(slot(denied.wrapper, "job-monitor-retry").exists()).toBe(false);
  });

  it("shows the last error and toggles the payload", async () => {
    const { wrapper } = await setup({
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
    await ready(wrapper);
    const [first, second] = rows(wrapper);
    if (!first || !second) throw new Error("expected two rows");
    expect(first.get("[data-slot=job-monitor-last-error]").text()).toBe("boom");
    expect(second.find("[data-slot=job-monitor-last-error]").exists()).toBe(
      false,
    );
    expect(second.text()).toContain("(no type)");
    const buttonNamed = (row: typeof first, name: string) =>
      row.findAll("button").find((b) => b.text() === name);
    expect(buttonNamed(second, "Show payload")).toBeUndefined();

    const toggle = buttonNamed(first, "Show payload");
    if (!toggle) throw new Error("no toggle");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(first.find("pre").exists()).toBe(false);
    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(first.get("pre").text()).toContain('"to": "a@b.c"');
    await toggle.trigger("click");
    expect(first.find("pre").exists()).toBe(false);
  });

  it("an open row follows a poll that changes its payload and creation time", async () => {
    const dataProvider = provider([
      job({
        id: 1,
        status: "failed",
        payload: { to: "old@b.c" },
        createdAt: "2026-01-02T10:00:00.000Z",
      }),
    ]);
    const { wrapper } = await setup({
      dataProvider,
      monitor: { tabs: ["failed"], pollInterval: 30 },
    });
    await ready(wrapper);
    const toggle = wrapper
      .findAll("button")
      .find((b) => b.text() === "Show payload");
    await toggle?.trigger("click");
    const created = slot(wrapper, "date-field").text();
    expect(wrapper.get("pre").text()).toContain("old@b.c");

    const changed = job({
      id: 1,
      status: "failed",
      payload: { to: "new@b.c" },
      createdAt: "2027-03-04T10:00:00.000Z",
    });
    dataProvider.getList = async () => ({ data: [changed], total: 1 });

    await vi.waitFor(() =>
      expect(wrapper.get("pre").text()).toContain("new@b.c"),
    );
    expect(slot(wrapper, "date-field").text()).not.toBe(created);
  });

  it("polls getList every pollInterval ms, and not with pollInterval 0", async () => {
    const polling = await setup({ monitor: { pollInterval: 30 } });
    await vi.waitFor(() =>
      expect(polling.getList.mock.calls.length).toBeGreaterThanOrEqual(3),
    );
    expect(polling.getList).toHaveBeenCalledWith(
      "jobs",
      expect.objectContaining({
        pagination: { page: 1, perPage: 200 },
        sort: { field: "createdAt", order: "DESC" },
      }),
    );
    polling.wrapper.unmount();

    const idle = await setup({ monitor: { pollInterval: 0 } });
    await ready(idle.wrapper);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(idle.getList).toHaveBeenCalledTimes(1);
  });

  it("reads the resource from context when no resource prop is given", async () => {
    const { wrapper, getList } = await setup({ inContext: true });
    await ready(wrapper);
    expect(getList).toHaveBeenCalledWith("jobs", expect.anything());
  });

  it("renders nothing with neither a resource prop nor a resource context", async () => {
    const { wrapper, getList } = await setup({
      monitor: { resource: undefined },
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(slot(wrapper, "job-monitor").exists()).toBe(false);
    expect(getList).not.toHaveBeenCalled();
  });

  it("shows an error line when getList fails", async () => {
    const dataProvider = fakeDataProvider({ jobs: [] });
    dataProvider.getList = async () => {
      throw new Error("down");
    };
    const { wrapper } = await setup({ dataProvider });
    await vi.waitFor(() =>
      expect(slot(wrapper, "job-monitor-error").exists()).toBe(true),
    );
    expect(slot(wrapper, "job-monitor-error").text()).toBe(
      "Server communication error",
    );
  });

  it("renders a type, last error and payload that hold markup as text", async () => {
    const { wrapper } = await setup({
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
    await ready(wrapper);
    const toggle = wrapper
      .findAll("button")
      .find((b) => b.text() === "Show payload");
    await toggle?.trigger("click");

    const root = slot(wrapper, "job-monitor");
    expect(root.element.querySelector("img, script")).toBeNull();
    expect(rows(wrapper)[0]?.text()).toContain("<img src=x onerror=alert(1)>");
    expect(slot(wrapper, "job-monitor-last-error").text()).toBe(
      "<script>alert(1)</script>",
    );
    expect(root.get("pre").text()).toContain("<script>alert(2)</script>");
  });
});
