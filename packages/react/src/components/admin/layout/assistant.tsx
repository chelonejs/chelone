/**
 * `<Assistant>` — a floating chat that streams a model's replies and runs the
 * app's tools. The session (messages, streaming, tool rounds, stop) lives in
 * `@chelone/core`; this file is the React shell around it.
 *
 * @example
 * const AppLayout = ({ children }) => (
 *   <>
 *     <Layout>{children}</Layout>
 *     <Assistant
 *       transport={httpAssistantTransport({ url: "/api/assistant" })}
 *       tools={tools}
 *     />
 *   </>
 * );
 */

import {
  type AssistantMessage,
  type AssistantTool,
  type AssistantToolCall,
  type AssistantTransport,
  createAssistantSession,
} from "@chelone/core";
import { MessageCircleIcon, SendIcon, SquareIcon, XIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui/button";
import { DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { Confirm } from "../feedback/confirm";

export interface AssistantProps {
  /** Where the conversation goes. A new transport starts a new conversation. */
  transport: AssistantTransport;
  /**
   * What the model may call, by name. A new object starts a new conversation,
   * so define it outside the component or memoize it.
   */
  tools?: Record<string, AssistantTool>;
  placement?: "bottom-right" | "bottom-left" | "sidebar";
  /** Text of the button and the panel's name. Defaults to the translated "Ask". */
  triggerLabel?: string;
  /** Shown before the first message. Defaults to the translated welcome. */
  welcomeMessage?: string;
  /** Follow-up turns after tool calls before the session gives up. Default 5. */
  maxToolRounds?: number;
}

const EMPTY_TOOLS: Record<string, AssistantTool> = {};

interface PendingConfirm {
  call: AssistantToolCall;
  resolve: (answer: boolean) => void;
}

const triggerPosition = {
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  sidebar: "top-4 right-4",
} as const;

const panelPosition = {
  "bottom-right": "bottom-20 right-4",
  "bottom-left": "bottom-20 left-4",
  sidebar: "top-20 right-4",
} as const;

export function Assistant({
  transport,
  tools = EMPTY_TOOLS,
  placement = "bottom-right",
  triggerLabel,
  welcomeMessage,
  maxToolRounds,
}: AssistantProps) {
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();

  const settle = useCallback((answer: boolean) => {
    pendingRef.current?.resolve(answer);
    pendingRef.current = null;
    setPending(null);
  }, []);

  const session = useMemo(
    () =>
      createAssistantSession({
        transport,
        tools,
        maxToolRounds,
        confirmTool: (call) =>
          new Promise<boolean>((resolve) => {
            const request = { call, resolve };
            pendingRef.current = request;
            setPending(request);
          }),
      }),
    [transport, tools, maxToolRounds],
  );
  const { messages, status, error } = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );

  // The unmount, and a new session replacing this one, end the old turn: no
  // tool runs after it and no dialog stays open. Closing the panel does neither.
  useEffect(
    () => () => {
      session.stop();
      settle(false);
    },
    [session, settle],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages, status and open are the triggers, not values read
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status, open]);

  const streaming = status === "streaming";

  const send = () => {
    if (streaming || !input.trim()) return;
    void session.send(input);
    setInput("");
  };

  const label =
    triggerLabel ?? translate("chelone.assistant.trigger", { _: "Ask" });
  const welcome =
    welcomeMessage ??
    translate("chelone.assistant.welcome", { _: "Hi! Ask me anything." });

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={cn(
          "fixed z-50 gap-2 rounded-full shadow-lg",
          triggerPosition[placement],
        )}
        data-slot="assistant-trigger"
      >
        <MessageCircleIcon className="size-4" />
        {label}
      </Button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={titleId}
          data-slot="assistant-panel"
          className={cn(
            "fixed z-50 flex max-h-[80vh] w-96 flex-col rounded-md border bg-background shadow-xl",
            panelPosition[placement],
          )}
        >
          <div className="flex items-center justify-between border-b p-3">
            <div id={titleId} className="text-sm font-medium">
              {label}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={translate("chelone.assistant.close", { _: "Close" })}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            >
              <XIcon className="size-4" />
            </button>
          </div>
          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            className="flex flex-1 flex-col gap-2 overflow-y-auto p-3"
          >
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground">{welcome}</div>
            ) : (
              messages.map((message, index) => (
                <MessageBubble
                  // biome-ignore lint/suspicious/noArrayIndexKey: the conversation only grows, so an index names a message for good
                  key={index}
                  message={message}
                />
              ))
            )}
            {streaming ? (
              <div className="text-xs italic text-muted-foreground">
                {translate("chelone.assistant.thinking", { _: "Thinking…" })}
              </div>
            ) : null}
          </div>
          {status === "error" ? (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 border-t px-3 py-2 text-sm text-destructive"
            >
              <span>
                {translate("chelone.assistant.error", {
                  _: "Something went wrong.",
                })}{" "}
                {error?.message}
              </span>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => void session.retry()}
              >
                {translate("chelone.assistant.retry", { _: "Retry" })}
              </Button>
            </div>
          ) : null}
          <div className="flex gap-2 border-t p-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.shiftKey) return;
                if (e.nativeEvent.isComposing) return;
                e.preventDefault();
                send();
              }}
              placeholder={translate("chelone.assistant.placeholder", {
                _: "Ask…",
              })}
              aria-label={translate("chelone.assistant.placeholder", {
                _: "Ask…",
              })}
              data-slot="assistant-input"
              className="flex-1 rounded-md border bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {streaming ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={() => session.stop()}
                aria-label={translate("chelone.assistant.stop", { _: "Stop" })}
                data-slot="assistant-stop"
              >
                <SquareIcon className="size-3" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon-sm"
                onClick={send}
                disabled={!input.trim()}
                aria-label={translate("chelone.assistant.send", { _: "Send" })}
              >
                <SendIcon className="size-3" />
              </Button>
            )}
          </div>
        </div>
      ) : null}
      <Confirm
        isOpen={pending !== null}
        title={translate("chelone.assistant.confirm", {
          _: "Run {name}?",
          name: pending?.call.toolName ?? "",
        })}
        content={
          <DialogDescription asChild>
            <pre className="overflow-auto whitespace-pre-wrap font-mono text-xs">
              {JSON.stringify(pending?.call.args ?? {}, null, 2)}
            </pre>
          </DialogDescription>
        }
        onConfirm={() => settle(true)}
        onClose={() => settle(false)}
      />
    </>
  );
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  if (message.role === "tool") {
    return (
      <div
        data-role="tool"
        className="rounded-md bg-muted/40 px-2 py-1 font-mono text-xs"
      >
        {message.toolName} &rarr;{" "}
        {message.error ?? JSON.stringify(message.result)}
      </div>
    );
  }
  // A turn that only called tools has no text to show.
  if (message.role === "assistant" && !message.content) return null;
  return (
    <div
      data-role={message.role}
      className={cn(
        "max-w-[85%] whitespace-pre-wrap rounded-md px-2 py-1 text-sm",
        message.role === "user"
          ? "self-end bg-primary text-primary-foreground"
          : "self-start bg-muted",
      )}
    >
      {message.content}
    </div>
  );
}
