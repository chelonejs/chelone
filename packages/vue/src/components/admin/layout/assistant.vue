<script lang="ts">
import type { AssistantTool, AssistantTransport } from "@chelone/core";

/** Props for {@link Assistant}. */
export interface AssistantProps {
  /** Where the conversation goes. A new transport starts a new conversation. */
  transport: AssistantTransport;
  /**
   * What the model may call, by name. A new object starts a new conversation,
   * so define it outside the component.
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
</script>

<script setup lang="ts">
/**
 * `<Assistant>` — a floating chat that streams a model's replies and runs the
 * app's tools. The Vue twin of `@chelone/react`'s `layout/assistant.tsx`. The
 * session (messages, streaming, tool rounds, stop) lives in `@chelone/core`;
 * this file is the Vue shell around it, with the same markup, `data-slot`
 * names, roles and translate keys.
 *
 * A tool with `confirm` opens `<Confirm>`. Closing the panel keeps the stream
 * running; unmounting, or a new `transport`, `tools` or `maxToolRounds`, ends
 * the turn: no tool runs after it and no dialog stays open.
 *
 * @example
 * <Assistant :transport="httpAssistantTransport({ url: '/api/assistant' })" :tools="tools" />
 */

import {
  type AssistantSession,
  type AssistantSessionState,
  type AssistantToolCall,
  createAssistantSession,
} from "@chelone/core";
import {
  type EffectScope,
  effectScope,
  nextTick,
  onBeforeUnmount,
  type Ref,
  shallowRef,
  useId,
  watch,
} from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { useMicroStore } from "../../../store/use-micro-store";
import Button from "../../ui/button.vue";
import Confirm from "../feedback/confirm.vue";
import { MessageCircleIcon, SendIcon, SquareIcon, XIcon } from "./icons";

const props = withDefaults(defineProps<AssistantProps>(), {
  tools: () => ({}),
  placement: "bottom-right",
});

interface PendingConfirm {
  call: AssistantToolCall;
  resolve: (answer: boolean) => void;
}

interface Live {
  session: AssistantSession;
  state: Readonly<Ref<AssistantSessionState>>;
  scope: EffectScope;
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

const translate = useTranslate();
const open = shallowRef(false);
const input = shallowRef("");
const pending = shallowRef<PendingConfirm | null>(null);
const logEl = shallowRef<HTMLElement | null>(null);
const panelId = useId();
const titleId = useId();

function settle(answer: boolean): void {
  pending.value?.resolve(answer);
  pending.value = null;
}

function start(): Live {
  const session = createAssistantSession({
    transport: props.transport,
    tools: props.tools,
    maxToolRounds: props.maxToolRounds,
    confirmTool: (call) =>
      new Promise<boolean>((resolve) => {
        pending.value = { call, resolve };
      }),
  });
  // The bridge unsubscribes when its scope stops, which is how a replaced
  // session lets go of its store.
  const scope = effectScope();
  const state = scope.run(() => useMicroStore(session));
  if (!state) throw new Error("Assistant: the session scope is not active");
  return { session, state, scope };
}

function end({ session, scope }: Live): void {
  scope.stop();
  session.stop();
  settle(false);
}

const live = shallowRef(start());

watch(
  () => [props.transport, props.tools, props.maxToolRounds] as const,
  () => {
    end(live.value);
    live.value = start();
  },
);

onBeforeUnmount(() => end(live.value));

watch(
  [() => live.value.state.value, open],
  async () => {
    await nextTick();
    const el = logEl.value;
    if (el) el.scrollTop = el.scrollHeight;
  },
  { flush: "post" },
);

function send(): void {
  const { session, state } = live.value;
  if (state.value.status === "streaming" || !input.value.trim()) return;
  void session.send(input.value);
  input.value = "";
}

function retry(): void {
  void live.value.session.retry();
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  send();
}

const label = () =>
  props.triggerLabel ?? translate("chelone.assistant.trigger", { _: "Ask" });
const welcome = () =>
  props.welcomeMessage ??
  translate("chelone.assistant.welcome", { _: "Hi! Ask me anything." });
const placeholder = () =>
  translate("chelone.assistant.placeholder", { _: "Ask…" });
const confirmTitle = () =>
  translate("chelone.assistant.confirm", {
    _: "Run {name}?",
    name: pending.value?.call.toolName ?? "",
  });
const confirmContent = () =>
  JSON.stringify(pending.value?.call.args ?? {}, null, 2);
</script>

<template>
  <Button
    :class="cn('fixed z-50 gap-2 rounded-full shadow-lg', triggerPosition[placement])"
    :aria-expanded="open"
    :aria-controls="open ? panelId : undefined"
    data-slot="assistant-trigger"
    @click="open = !open"
  >
    <MessageCircleIcon class="size-4" />
    {{ label() }}
  </Button>
  <div
    v-if="open"
    :id="panelId"
    role="dialog"
    :aria-labelledby="titleId"
    data-slot="assistant-panel"
    :class="
      cn(
        'fixed z-50 flex max-h-[80vh] w-96 flex-col rounded-md border bg-background shadow-xl',
        panelPosition[placement],
      )
    "
  >
    <div class="flex items-center justify-between border-b p-3">
      <div :id="titleId" class="text-sm font-medium">{{ label() }}</div>
      <button
        type="button"
        :aria-label="translate('chelone.assistant.close', { _: 'Close' })"
        class="rounded-md p-1 text-muted-foreground hover:bg-accent"
        @click="open = false"
      >
        <XIcon class="size-4" />
      </button>
    </div>
    <div
      ref="logEl"
      role="log"
      aria-live="polite"
      class="flex flex-1 flex-col gap-2 overflow-y-auto p-3"
    >
      <div
        v-if="live.state.value.messages.length === 0"
        class="text-sm text-muted-foreground"
      >
        {{ welcome() }}
      </div>
      <template v-else>
        <template
          v-for="(message, index) in live.state.value.messages"
          :key="index"
        >
          <div
            v-if="message.role === 'tool'"
            data-role="tool"
            class="rounded-md bg-muted/40 px-2 py-1 font-mono text-xs"
          >
            {{ message.toolName }} &rarr;
            {{ message.error ?? JSON.stringify(message.result) }}
          </div>
          <!-- A turn that only called tools has no text to show. -->
          <div
            v-else-if="message.role === 'user' || message.content"
            :data-role="message.role"
            :class="
              cn(
                'max-w-[85%] whitespace-pre-wrap rounded-md px-2 py-1 text-sm',
                message.role === 'user'
                  ? 'self-end bg-primary text-primary-foreground'
                  : 'self-start bg-muted',
              )
            "
          >{{ message.content }}</div>
        </template>
      </template>
      <div
        v-if="live.state.value.status === 'streaming'"
        class="text-xs italic text-muted-foreground"
      >
        {{ translate("chelone.assistant.thinking", { _: "Thinking…" }) }}
      </div>
    </div>
    <div
      v-if="live.state.value.status === 'error'"
      role="alert"
      class="flex items-center justify-between gap-2 border-t px-3 py-2 text-sm text-destructive"
    >
      <span>
        {{ translate("chelone.assistant.error", { _: "Something went wrong." }) }}
        {{ live.state.value.error?.message }}
      </span>
      <Button variant="outline" size="sm" @click="retry">
        {{ translate("chelone.assistant.retry", { _: "Retry" }) }}
      </Button>
    </div>
    <div class="flex gap-2 border-t p-2">
      <input
        v-model="input"
        type="text"
        :placeholder="placeholder()"
        :aria-label="placeholder()"
        data-slot="assistant-input"
        class="flex-1 rounded-md border bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @keydown="onKeydown"
      />
      <Button
        v-if="live.state.value.status === 'streaming'"
        variant="outline"
        size="icon"
        class="size-8"
        :aria-label="translate('chelone.assistant.stop', { _: 'Stop' })"
        data-slot="assistant-stop"
        @click="live.session.stop()"
      >
        <SquareIcon class="size-3" />
      </Button>
      <Button
        v-else
        size="icon"
        class="size-8"
        :disabled="!input.trim()"
        :aria-label="translate('chelone.assistant.send', { _: 'Send' })"
        @click="send"
      >
        <SendIcon class="size-3" />
      </Button>
    </div>
  </div>
  <Confirm
    :is-open="pending !== null"
    :title="confirmTitle()"
    :content="confirmContent()"
    @confirm="settle(true)"
    @close="settle(false)"
  />
</template>
