<script lang="ts">
import type { Component } from "vue";

/**
 * What a custom `error` slot receives — the Vue analog of `@chelone/react`'s
 * `ErrorFallbackProps` (defined in the React twin's `admin/error-boundary.tsx`).
 *
 * DELIBERATE DIVERGENCE: `@chelone/vue` ships no error-boundary yet (the React
 * twin's boundary is a class component; Vue's mechanism is `onErrorCaptured`,
 * which hands `(err, instance, info: string)`), so `errorInfo` is Vue's
 * lifecycle-hook info STRING (or a component stack), not React's `ErrorInfo`.
 * The contract is defined locally here so `<Error>` drops into an
 * `onErrorCaptured` fallback once a Vue boundary lands.
 */
export interface ErrorFallbackProps {
  /** The thrown error. */
  error: unknown;
  /** Vue's captured lifecycle-hook info / component stack (dev-facing). */
  errorInfo?: string | null;
  /** Reset the boundary imperatively. */
  resetErrorBoundary?: () => void;
}

/** Props for {@link ErrorPage} (exported as `Error`). */
export interface ErrorProps extends ErrorFallbackProps {
  /** A custom component to render instead of the built-in error page. */
  errorComponent?: Component;
  /**
   * When provided, injects a `<Title>` portal to update the app-bar page title.
   * Pass `false` to explicitly suppress a title.
   */
  title?: string | false;
  /** Extra CSS class appended to the root. */
  class?: string;
}

// Bundler-replaced dev/prod flag (mirrors the React twin + `util/warning`).
// `@chelone/vue` ships no `@types/node`; a minimal ambient declaration keeps the
// reference typed without pulling in Node's types.
declare const process: { env?: { NODE_ENV?: string } } | undefined;

const IS_DEV =
  (typeof process !== "undefined" ? process.env?.NODE_ENV : undefined) !==
  "production";
</script>

<script setup lang="ts">
/**
 * `<Error>` — the app-wide error page, the Vue twin of `@chelone/react`'s
 * `feedback/error.tsx`. Shows the translated error heading + message and a back
 * button; in development, expands the error message + component stack in a native
 * `<details>` disclosure (the Vue package ships no `ui/accordion` primitive — the
 * React twin's radix `<Accordion>` becomes a dependency-free `<details>`).
 *
 * Exported as `Error` for react-admin API parity; the internal declaration is
 * `ErrorPage` so the module never shadows the global `Error`.
 */

import { computed } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import Title from "../layout/title.vue";
import { CircleAlertIcon, HistoryIcon } from "./icons";

const props = defineProps<ErrorProps>();

const translate = useTranslate();

// Mirrors the React twin: an empty message stays empty, it does not fall back.
const errorMessage = computed<string>(() => {
  const error = props.error;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  if (typeof error === "string") return error;
  return String(error ?? "Unknown error");
});

const showDev = computed(() => IS_DEV);

function goBack(): void {
  if (typeof window !== "undefined") window.history.go(-1);
}
</script>

<template>
  <component
    :is="errorComponent"
    v-if="errorComponent"
    :error="error"
    :error-info="errorInfo"
    :reset-error-boundary="resetErrorBoundary"
  />
  <div v-else class="flex flex-col items-center md:p-16 gap-5" :class="props.class">
    <Title
      v-if="title"
      :default-title="typeof title === 'string' ? title : undefined"
    />
    <h1 class="flex items-center text-3xl mt-5 mb-5 gap-3" role="alert">
      <CircleAlertIcon class="w-[2em] h-[2em]" />
      {{ translate("chelone.page.error", { _: "Something Went Wrong" }) }}
    </h1>
    <div>
      {{
        translate("chelone.message.error", {
          _: "A client error occurred and your request couldn't be completed.",
        })
      }}
    </div>
    <template v-if="showDev">
      <details class="mt-1 p-2 bg-secondary w-full max-w-150">
        <summary class="py-2 cursor-pointer">
          {{ translate(errorMessage, { _: errorMessage }) }}
        </summary>
        <div class="whitespace-pre-wrap pt-1">
          <pre class="text-xs">{{ errorInfo }}</pre>
        </div>
      </details>
      <p class="text-center">Need help with this error? Try the following:</p>
      <div>
        <ul class="list-disc">
          <li>
            Check the
            <a
              class="text-primary underline-offset-4 hover:underline"
              href="https://chelone.dev/docs"
              >Chelone documentation</a
            >
          </li>
          <li>
            Search on
            <a
              class="text-primary underline-offset-4 hover:underline"
              href="https://stackoverflow.com/questions/tagged/chelone"
              >StackOverflow</a
            >
            for community answers
          </li>
          <li>
            Get help from the core team via
            <a
              class="text-primary underline-offset-4 hover:underline"
              href="https://chelone.dev/"
              >Chelone</a
            >
          </li>
        </ul>
      </div>
    </template>
    <div class="mt-8">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        @click="goBack"
      >
        <HistoryIcon class="size-4" />
        {{ translate("chelone.action.back", { _: "Back" }) }}
      </button>
    </div>
  </div>
</template>
