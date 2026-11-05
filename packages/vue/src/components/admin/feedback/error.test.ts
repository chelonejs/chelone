/**
 * `<Error>` tests: the app-wide error page, the Vue twin of
 * `@chelone/react`'s `feedback/error.tsx`.
 *
 * Asserts: the dev details line shows the message of a thrown Error, a thrown
 * string, and the string form of a value that carries no message.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import ErrorPage from "./error.vue";

enableAutoUnmount(afterEach);

const Blank = defineComponent({ setup: () => () => h("div") });

function mountError(error: Error | string | { message: string } | undefined) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: Blank }],
  });
  return mount(
    defineComponent({
      setup() {
        return () =>
          h(
            Admin,
            {
              dataProvider: fakeDataProvider({}),
              queryClient: new QueryClient(),
              i18n: createI18n({
                locale: "en",
                messages: { en: defineMessages({}) },
              }),
            },
            { default: () => h(ErrorPage, { error }) },
          );
      },
    }),
    { global: { plugins: [router] } },
  );
}

describe("<Error>", () => {
  it("Error shows the message of a thrown Error", () => {
    const wrapper = mountError(new Error("Boom"));

    expect(wrapper.get("summary").text()).toBe("Boom");
  });

  it("Error shows a thrown string", () => {
    const wrapper = mountError("Something broke");

    expect(wrapper.get("summary").text()).toBe("Something broke");
  });

  it("Error shows an empty message as empty", () => {
    expect(mountError(new Error("")).get("summary").text()).toBe("");
    expect(mountError({ message: "" }).get("summary").text()).toBe("");
  });

  it("Error shows Unknown error when nothing was thrown", () => {
    const wrapper = mountError(undefined);

    expect(wrapper.get("summary").text()).toBe("Unknown error");
  });
});
