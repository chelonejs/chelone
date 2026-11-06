/**
 * `<Assistant>` mounted the way an app does: in the `#layout` slot of a real
 * `<Admin>`. Assertions are on DOM, roles and the transport and tool calls;
 * jsdom applies no CSS, so nothing here checks styling.
 */

import {
  type AssistantChunk,
  type AssistantMessage,
  type AssistantTool,
  type AssistantTransport,
  createI18n,
  echoAssistantTransport,
  fakeDataProvider,
  type JsonObject,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import Assistant, { type AssistantProps } from "./assistant.vue";

const Blank = defineComponent({ setup: () => () => h("div") });

const mounted: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  document.body.innerHTML = "";
});

const text = (delta: string): AssistantChunk => ({ type: "text", delta });
const done: AssistantChunk = { type: "done" };
const toolCall = (
  id: string,
  toolName: string,
  args: JsonObject = {},
): AssistantChunk => ({ type: "tool-call", id, toolName, args });

interface Sent {
  messages: readonly AssistantMessage[];
  signal: AbortSignal;
}

type Turn =
  | AssistantChunk[]
  | ((signal: AbortSignal) => AsyncIterable<AssistantChunk>);

/** Plays one scripted turn per `send`, the last one again after that. */
function scripted(...turns: Turn[]) {
  const sent: Sent[] = [];
  const transport: AssistantTransport = {
    send(messages, _tools, { signal }) {
      sent.push({ messages, signal });
      const turn = turns[Math.min(sent.length - 1, turns.length - 1)];
      if (typeof turn === "function") return turn(signal);
      return (async function* () {
        for (const chunk of turn ?? []) yield chunk;
      })();
    },
  };
  return { transport, sent };
}

/** Says `Hel`, then waits for the abort. */
async function* hangAfterText(signal: AbortSignal) {
  yield text("Hel");
  await new Promise<void>((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

const tool = (overrides: Partial<AssistantTool> = {}): AssistantTool => ({
  description: "A tool",
  parameters: { type: "object", properties: {} },
  handler: () => "ok",
  ...overrides,
});

async function mountAssistant(
  initial: AssistantProps,
  messages: Record<string, string> = {},
  onMissingKey?: (key: string) => void,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: Blank }],
  });
  await router.push("/");
  const props = shallowRef<AssistantProps>(initial);
  const wrapper = mount(Admin, {
    props: {
      dataProvider: fakeDataProvider({ posts: [] }),
      queryClient: new QueryClient(),
      i18n: createI18n({
        locale: "en",
        messages: { en: messages },
        onMissingKey,
      }),
    },
    slots: {
      default: () => h(Resource, { name: "posts", list: Blank }),
      layout: () => h("div", [h(Assistant, props.value)]),
    },
    global: { plugins: [router] },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  await flushPromises();
  return {
    wrapper,
    setProps: async (next: AssistantProps) => {
      props.value = next;
      await flushPromises();
    },
  };
}

const q = <T extends Element>(selector: string) =>
  document.body.querySelector<T>(selector);
const byName = (name: string | RegExp) =>
  [...document.body.querySelectorAll("button")].find((button) => {
    const label = button.getAttribute("aria-label") ?? button.textContent ?? "";
    return typeof name === "string" ? label.trim() === name : name.test(label);
  });
const trigger = () => q<HTMLButtonElement>('[data-slot="assistant-trigger"]');
const panel = () => q<HTMLElement>('[data-slot="assistant-panel"]');
const log = () => q<HTMLElement>('[role="log"]');
const field = () => q<HTMLInputElement>('[data-slot="assistant-input"]');
const confirmDialog = () => q<HTMLElement>('[role="alertdialog"]');

async function openPanel() {
  trigger()?.click();
  await flushPromises();
}

async function say(value: string) {
  const input = field();
  if (!input) throw new Error("the panel is closed");
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
  );
  await flushPromises();
}

/** Poll until `predicate` holds, flushing promises and timers between tries. */
async function until(predicate: () => boolean, tries = 100): Promise<void> {
  for (let i = 0; i < tries; i += 1) {
    if (predicate()) return;
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(
    `until: condition never became true\n${document.body.innerHTML}`,
  );
}

const logHas = (value: string) => () =>
  log()?.textContent?.includes(value) === true;

describe("<Assistant>", () => {
  it("opens the panel and echoes user input", async () => {
    await mountAssistant({ transport: echoAssistantTransport() });
    expect(panel()).toBeNull();
    expect(trigger()?.getAttribute("aria-expanded")).toBe("false");

    await openPanel();

    expect(trigger()?.getAttribute("aria-expanded")).toBe("true");
    expect(panel()?.getAttribute("role")).toBe("dialog");
    expect(panel()?.getAttribute("aria-labelledby")).toBeTruthy();
    expect(
      document.getElementById(panel()?.getAttribute("aria-labelledby") ?? "")
        ?.textContent,
    ).toBe("Ask");

    await say("hi");

    await until(logHas("Echo: hi"));
    const roles = Array.from(log()?.querySelectorAll("[data-role]") ?? []).map(
      (node) => [node.getAttribute("data-role"), node.textContent],
    );
    expect(roles).toEqual([
      ["user", "hi"],
      ["assistant", "Echo: hi"],
    ]);
    expect(log()?.getAttribute("aria-live")).toBe("polite");
    expect(field()?.value).toBe("");
  });

  it("shows the welcome message before the first message", async () => {
    await mountAssistant({ transport: echoAssistantTransport() });
    await openPanel();
    expect(log()?.textContent).toContain("Hi! Ask me anything.");

    await say("hi");

    await until(logHas("Echo: hi"));
    expect(log()?.textContent).not.toContain("Hi! Ask me anything.");
  });

  it("takes the welcome message and trigger label from props", async () => {
    await mountAssistant({
      transport: echoAssistantTransport(),
      welcomeMessage: "Welcome back",
      triggerLabel: "Help",
    });
    expect(trigger()?.textContent?.trim()).toBe("Help");
    await openPanel();
    expect(log()?.textContent).toContain("Welcome back");
    expect(
      document.getElementById(panel()?.getAttribute("aria-labelledby") ?? "")
        ?.textContent,
    ).toBe("Help");
  });

  it("translates the labels, the close button included", async () => {
    await mountAssistant(
      { transport: echoAssistantTransport() },
      {
        "chelone.assistant.trigger": "Demander",
        "chelone.assistant.close": "Fermer",
        "chelone.assistant.placeholder": "Votre question",
      },
    );
    expect(trigger()?.textContent?.trim()).toBe("Demander");
    await openPanel();
    expect(byName("Fermer")).toBeTruthy();
    expect(field()?.getAttribute("placeholder")).toBe("Votre question");
  });

  it("runs a tool call, shows its result and streams the follow-up reply", async () => {
    const handler = vi.fn((args: JsonObject) => ({ count: 3, args }));
    const { transport, sent } = scripted(
      [toolCall("c1", "count_posts", { status: "draft" }), done],
      [text("There "), text("are 3"), done],
    );
    await mountAssistant({
      transport,
      tools: { count_posts: tool({ handler }) },
    });
    await openPanel();

    await say("how many drafts?");

    await until(logHas("There are 3"));
    expect(handler).toHaveBeenCalledWith({ status: "draft" });
    const toolMessage = log()?.querySelector('[data-role="tool"]');
    expect(toolMessage?.textContent).toContain("count_posts");
    expect(toolMessage?.textContent).toContain(
      '{"count":3,"args":{"status":"draft"}}',
    );
    expect(sent).toHaveLength(2);
    expect(q('[role="alert"]')).toBeNull();
  });

  it("a tool with confirm asks first and a declined call runs nothing", async () => {
    const handler = vi.fn(() => "deleted");
    const { transport } = scripted(
      [toolCall("c1", "delete_post", { id: 7 }), done],
      [text("Left it alone"), done],
    );
    await mountAssistant({
      transport,
      tools: { delete_post: tool({ handler, confirm: true }) },
    });
    await openPanel();

    await say("delete post 7");

    await until(() => confirmDialog() !== null);
    const dialog = confirmDialog();
    expect(dialog?.textContent).toContain("delete_post");
    expect(dialog?.textContent).not.toContain("%");
    expect(dialog?.textContent).toContain('"id": 7');
    expect(handler).not.toHaveBeenCalled();

    q<HTMLButtonElement>('[data-slot="confirm-cancel"]')?.click();

    await until(logHas("Left it alone"));
    expect(handler).not.toHaveBeenCalled();
    expect(confirmDialog()).toBeNull();
    expect(log()?.querySelector('[data-role="tool"]')?.textContent).toContain(
      "declined",
    );
  });

  it("the confirm dialog shows the arguments as written, in a preformatted block", async () => {
    const args = { q: "{_}", nested: { id: 7 } };
    const { transport } = scripted(
      [toolCall("c1", "delete_post", args), done],
      [text("Left it alone"), done],
    );
    const missing = vi.fn();
    await mountAssistant(
      {
        transport,
        tools: { delete_post: tool({ confirm: true }) },
      },
      {},
      missing,
    );
    await openPanel();

    await say("delete post 7");

    await until(() => confirmDialog() !== null);
    const shown = confirmDialog()?.querySelector("pre");
    expect(shown?.textContent).toBe(JSON.stringify(args, null, 2));
    expect(missing).not.toHaveBeenCalledWith(expect.stringContaining("nested"));
  });

  it("a confirmed call runs the tool", async () => {
    const handler = vi.fn(() => "deleted");
    const { transport } = scripted(
      [toolCall("c1", "delete_post", { id: 7 }), done],
      [text("Gone"), done],
    );
    await mountAssistant({
      transport,
      tools: { delete_post: tool({ handler, confirm: true }) },
    });
    await openPanel();
    await say("delete post 7");
    await until(() => confirmDialog() !== null);

    q<HTMLButtonElement>('[data-slot="confirm-accept"]')?.click();

    await until(logHas("Gone"));
    expect(handler).toHaveBeenCalledWith({ id: 7 });
  });

  it("Stop ends the stream and keeps the text so far", async () => {
    const { transport, sent } = scripted(hangAfterText);
    await mountAssistant({ transport });
    await openPanel();

    await say("hello");

    await until(logHas("Hel"));
    const stop = byName("Stop");
    expect(stop?.getAttribute("data-slot")).toBe("assistant-stop");

    stop?.click();

    expect(sent[0]?.signal.aborted).toBe(true);
    await until(() => byName("Stop") === undefined);
    expect(log()?.textContent).toContain("Hel");
    expect(q('[role="alert"]')).toBeNull();
  });

  it("a transport error shows an alert and Retry sends again", async () => {
    const failing = async function* (): AsyncGenerator<AssistantChunk> {
      yield* [];
      throw new Error("Model unavailable");
    };
    const { transport, sent } = scripted(failing, [text("Back"), done]);
    await mountAssistant({ transport });
    await openPanel();

    await say("hello");

    await until(() => q('[role="alert"]') !== null);
    expect(q('[role="alert"]')?.textContent).toContain("Model unavailable");

    byName("Retry")?.click();

    await until(logHas("Back"));
    expect(q('[role="alert"]')).toBeNull();
    expect(sent).toHaveLength(2);
    expect(sent[1]?.messages).toEqual([{ role: "user", content: "hello" }]);
    expect(log()?.querySelectorAll('[data-role="user"]')).toHaveLength(1);
  });

  it("unmounting aborts the stream", async () => {
    const { transport, sent } = scripted(hangAfterText);
    const { wrapper } = await mountAssistant({ transport });
    await openPanel();
    await say("hello");
    await until(logHas("Hel"));

    wrapper.unmount();

    expect(sent[0]?.signal.aborted).toBe(true);
  });

  it("closing the panel keeps the stream running", async () => {
    const { transport, sent } = scripted(hangAfterText);
    await mountAssistant({ transport });
    await openPanel();
    await say("hello");
    await until(logHas("Hel"));

    byName("Close")?.click();
    await flushPromises();

    expect(panel()).toBeNull();
    expect(sent[0]?.signal.aborted).toBe(false);
    await openPanel();
    expect(log()?.textContent).toContain("Hel");
  });

  it("a new transport starts a new conversation", async () => {
    const { setProps } = await mountAssistant({
      transport: echoAssistantTransport(),
    });
    await openPanel();
    await say("hi");
    await until(logHas("Echo: hi"));

    await setProps({ transport: echoAssistantTransport() });

    expect(log()?.textContent).not.toContain("Echo: hi");
    expect(log()?.textContent).toContain("Hi! Ask me anything.");
  });

  it("a new transport aborts the old stream and closes its dialog", async () => {
    const handler = vi.fn(() => "deleted");
    const first = scripted([toolCall("c1", "delete_post", { id: 7 }), done]);
    const tools = { delete_post: tool({ handler, confirm: true }) };
    const { setProps } = await mountAssistant({
      transport: first.transport,
      tools,
    });
    await openPanel();
    await say("delete post 7");
    await until(() => confirmDialog() !== null);

    await setProps({ transport: echoAssistantTransport(), tools });

    expect(confirmDialog()).toBeNull();
    expect(first.sent[0]?.signal.aborted).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });

  it("renders a reply and a tool result that hold markup as text", async () => {
    const markup = "<img src=x onerror=alert(1)><script>alert(2)</script>";
    const { transport } = scripted(
      [toolCall("c1", "lookup", {}), done],
      [text(markup), done],
    );
    await mountAssistant({
      transport,
      tools: { lookup: tool({ handler: () => markup }) },
    });
    await openPanel();

    await say("go");

    await until(logHas(markup));
    expect(log()?.textContent).toContain(JSON.stringify(markup));
    expect(document.body.querySelector("img")).toBeNull();
    expect(document.body.querySelector("script")).toBeNull();
  });
});
