/**
 * `<Assistant>` mounted the way an app does: in the `Admin.Layout` slot of a
 * real `<Admin>`. Assertions are on DOM, roles and the transport and tool
 * calls; jsdom applies no CSS, so nothing here checks styling.
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
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Admin, Resource } from "../../../index";
import { Assistant, type AssistantProps } from "./assistant";

afterEach(cleanup);

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

const stubPage = () => <div />;

function mount(
  props: AssistantProps,
  messages: Record<string, string> = {},
  siblings?: ReactNode,
) {
  const i18n = createI18n({ locale: "en", messages: { en: messages } });
  const queryClient = new QueryClient();
  const element = (assistant: AssistantProps) => (
    <MemoryRouter initialEntries={["/posts"]}>
      <Admin
        dataProvider={fakeDataProvider({ posts: [] })}
        queryClient={queryClient}
        i18n={i18n}
      >
        <Admin.Layout>
          <AppLayout assistant={assistant}>{siblings}</AppLayout>
        </Admin.Layout>
        <Resource name="posts" list={stubPage} />
      </Admin>
    </MemoryRouter>
  );
  const view = render(element(props));
  return {
    view,
    rerender: (next: AssistantProps) => view.rerender(element(next)),
  };
}

function AppLayout({
  assistant,
  children,
}: {
  assistant: AssistantProps;
  children?: ReactNode;
}) {
  return (
    <div>
      <Assistant {...assistant} />
      {children}
    </div>
  );
}

const trigger = () => screen.getByRole("button", { name: "Ask" });
const openPanel = () => fireEvent.click(trigger());
const log = () => screen.getByRole("log");

function say(value: string) {
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: "Enter" });
}

describe("<Assistant>", () => {
  it("opens the panel and echoes user input", async () => {
    mount({ transport: echoAssistantTransport() });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger().getAttribute("data-slot")).toBe("assistant-trigger");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");

    openPanel();

    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    const panel = screen.getByRole("dialog", { name: "Ask" });
    expect(panel.getAttribute("data-slot")).toBe("assistant-panel");
    expect(screen.getByRole("textbox").getAttribute("data-slot")).toBe(
      "assistant-input",
    );

    say("hi");

    await within(log()).findByText("Echo: hi");
    const roles = Array.from(log().querySelectorAll("[data-role]")).map(
      (node) => [node.getAttribute("data-role"), node.textContent],
    );
    expect(roles).toEqual([
      ["user", "hi"],
      ["assistant", "Echo: hi"],
    ]);
    expect(log().getAttribute("aria-live")).toBe("polite");
    expect(screen.getByRole("textbox")).toHaveProperty("value", "");
  });

  it("shows the welcome message before the first message", async () => {
    mount({ transport: echoAssistantTransport() });
    openPanel();
    expect(within(log()).getByText("Hi! Ask me anything.")).toBeTruthy();

    say("hi");

    await within(log()).findByText("Echo: hi");
    expect(within(log()).queryByText("Hi! Ask me anything.")).toBeNull();
  });

  it("takes the welcome message and trigger label from props", () => {
    mount({
      transport: echoAssistantTransport(),
      welcomeMessage: "Welcome back",
      triggerLabel: "Help",
    });
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    expect(screen.getByRole("dialog", { name: "Help" })).toBeTruthy();
    expect(within(log()).getByText("Welcome back")).toBeTruthy();
  });

  it("translates the labels, the close button included", () => {
    mount(
      { transport: echoAssistantTransport() },
      {
        "chelone.assistant.trigger": "Demander",
        "chelone.assistant.close": "Fermer",
        "chelone.assistant.placeholder": "Votre question",
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Demander" }));
    expect(screen.getByRole("button", { name: "Fermer" })).toBeTruthy();
    expect(screen.getByPlaceholderText("Votre question")).toBeTruthy();
  });

  it("runs a tool call, shows its result and streams the follow-up reply", async () => {
    const handler = vi.fn((args: JsonObject) => ({ count: 3, args }));
    const { transport, sent } = scripted(
      [toolCall("c1", "count_posts", { status: "draft" }), done],
      [text("There "), text("are 3"), done],
    );
    mount({ transport, tools: { count_posts: tool({ handler }) } });
    openPanel();

    say("how many drafts?");

    await within(log()).findByText("There are 3");
    expect(handler).toHaveBeenCalledWith({ status: "draft" });
    const toolMessage = log().querySelector('[data-role="tool"]');
    expect(toolMessage?.textContent).toContain("count_posts");
    expect(toolMessage?.textContent).toContain(
      '{"count":3,"args":{"status":"draft"}}',
    );
    expect(sent).toHaveLength(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a tool with confirm asks first and a declined call runs nothing", async () => {
    const handler = vi.fn(() => "deleted");
    const { transport } = scripted(
      [toolCall("c1", "delete_post", { id: 7 }), done],
      [text("Left it alone"), done],
    );
    mount({
      transport,
      tools: { delete_post: tool({ handler, confirm: true }) },
    });
    openPanel();

    say("delete post 7");

    const dialog = await screen.findByRole("dialog", { name: /delete_post/ });
    expect(dialog.textContent).toContain('"id": 7');
    expect(handler).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));

    await screen.findByText("Left it alone");
    expect(handler).not.toHaveBeenCalled();
    expect(
      screen.getByRole("log").querySelector('[data-role="tool"]')?.textContent,
    ).toContain("declined");
  });

  it("a confirmed call runs the tool", async () => {
    const handler = vi.fn(() => "deleted");
    const { transport } = scripted(
      [toolCall("c1", "delete_post", { id: 7 }), done],
      [text("Gone"), done],
    );
    mount({
      transport,
      tools: { delete_post: tool({ handler, confirm: true }) },
    });
    openPanel();
    say("delete post 7");

    const dialog = await screen.findByRole("dialog", { name: /delete_post/ });
    fireEvent.click(within(dialog).getByRole("button", { name: /confirm/i }));

    await screen.findByText("Gone");
    expect(handler).toHaveBeenCalledWith({ id: 7 });
  });

  it("Stop ends the stream and keeps the text so far", async () => {
    const { transport, sent } = scripted(hangAfterText);
    mount({ transport });
    openPanel();

    say("hello");

    await within(log()).findByText("Hel");
    const stop = screen.getByRole("button", { name: "Stop" });
    expect(stop.getAttribute("data-slot")).toBe("assistant-stop");

    fireEvent.click(stop);

    expect(sent[0]?.signal.aborted).toBe(true);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Stop" })).toBeNull(),
    );
    expect(within(log()).getByText("Hel")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a transport error shows an alert and Retry sends again", async () => {
    const failing = async function* (): AsyncGenerator<AssistantChunk> {
      yield* [];
      throw new Error("Model unavailable");
    };
    const { transport, sent } = scripted(failing, [text("Back"), done]);
    mount({ transport });
    openPanel();

    say("hello");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Model unavailable");

    fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));

    await within(log()).findByText("Back");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(sent).toHaveLength(2);
    expect(sent[1]?.messages).toEqual([{ role: "user", content: "hello" }]);
    expect(within(log()).getAllByText("hello")).toHaveLength(1);
  });

  it("unmounting aborts the stream", async () => {
    const { transport, sent } = scripted(hangAfterText);
    const { view } = mount({ transport });
    openPanel();
    say("hello");
    await within(log()).findByText("Hel");

    view.unmount();

    expect(sent[0]?.signal.aborted).toBe(true);
  });

  it("closing the panel keeps the stream running", async () => {
    const { transport, sent } = scripted(hangAfterText);
    mount({ transport });
    openPanel();
    say("hello");
    await within(log()).findByText("Hel");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(sent[0]?.signal.aborted).toBe(false);
    openPanel();
    expect(within(log()).getByText("Hel")).toBeTruthy();
  });

  it("a new transport starts a new conversation", async () => {
    const { rerender } = mount({ transport: echoAssistantTransport() });
    openPanel();
    say("hi");
    await within(log()).findByText("Echo: hi");

    rerender({ transport: echoAssistantTransport() });

    expect(within(log()).queryByText("Echo: hi")).toBeNull();
    expect(within(log()).getByText("Hi! Ask me anything.")).toBeTruthy();
  });

  it("renders a reply and a tool result that hold markup as text", async () => {
    const markup = "<img src=x onerror=alert(1)><script>alert(2)</script>";
    const { transport } = scripted(
      [toolCall("c1", "lookup", {}), done],
      [text(markup), done],
    );
    mount({
      transport,
      tools: { lookup: tool({ handler: () => markup }) },
    });
    openPanel();

    say("go");

    await within(log()).findByText(markup);
    expect(log().textContent).toContain(JSON.stringify(markup));
    expect(document.body.querySelector("img")).toBeNull();
    expect(document.body.querySelector("script")).toBeNull();
  });
});
