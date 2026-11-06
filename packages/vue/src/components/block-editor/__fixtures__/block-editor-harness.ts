import {
  type BlockDocNode,
  createI18n,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
  type ResourceDefinition,
} from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { Editor } from "@tiptap/core";
import { flushPromises, mount } from "@vue/test-utils";
import { expect, type Mock, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { type UseFormReturn, useForm } from "../../../form/use-form";
import BlockEditorInput, {
  type BlockEditorInputProps,
} from "../block-editor-input.vue";

/** ProseMirror measures the DOM while it scrolls the selection into view, which jsdom has no layout for. */
export function stubLayout() {
  const rect = new DOMRect(0, 0, 0, 0);
  const rects = Object.assign([], { item: () => null });
  Range.prototype.getClientRects = () => rects;
  Range.prototype.getBoundingClientRect = () => rect;
  Element.prototype.getClientRects = () => rects;
  document.elementFromPoint = () => null;
}

const mounted: { unmount(): void }[] = [];

/** Unmounts every wrapper the harness mounted. Call it from `afterEach`. */
export function unmountAll() {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
}

export const paragraph = (text: string): BlockDocNode => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

export const doc = (...content: BlockDocNode[]): BlockDocNode => ({
  type: "doc",
  content,
});

export interface FormValues {
  // `BlockDocNode` is recursive, which form-core's path types cannot follow.
  body: object | null;
}

const messages = defineMessages({ "chelone.validation.required": "Required" });

export interface AdminOptions {
  dataProvider?: DataProvider;
  resources?: ResourceDefinition[];
}

export function mountUnderAdmin(
  child: () => VNodeChild,
  { dataProvider = fakeDataProvider({}), resources }: AdminOptions = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          Admin,
          {
            dataProvider,
            resources,
            queryClient: new QueryClient({
              defaultOptions: { queries: { retry: false } },
            }),
            i18n: createI18n({ locale: "en", messages: { en: messages } }),
          },
          { default: child },
        ),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  mounted.push(wrapper);
  return wrapper;
}

/** tiptap leaves its editor on the ProseMirror element. */
export function editorOf(element: Element): Editor {
  const editor = Object.getOwnPropertyDescriptor(element, "editor")?.value;
  if (!(editor instanceof Editor))
    throw new Error("No tiptap editor on the element");
  return editor;
}

export async function mountBlockEditor(
  props: Partial<BlockEditorInputProps> = {},
  { body = null, ...admin }: { body?: object | null } & AdminOptions = {},
) {
  const captured: { form?: UseFormReturn<FormValues> } = {};
  const onSubmit: Mock<(data: FormValues) => Promise<undefined>> = vi.fn(
    async () => undefined,
  );
  const wrapper = mountUnderAdmin(
    () =>
      h(
        defineComponent({
          setup() {
            captured.form = useForm<FormValues>({ record: { body }, onSubmit });
            return () => h(BlockEditorInput, { source: "body", ...props });
          },
        }),
      ),
    admin,
  );
  await vi.waitFor(() =>
    expect(wrapper.find('[role="textbox"]').exists()).toBe(true),
  );
  await flushPromises();
  const textbox = elementOf(
    wrapper.get('[role="textbox"]').element,
    HTMLElement,
  );
  const form = defined(captured.form);
  return {
    wrapper,
    form,
    onSubmit,
    dom: () => textbox,
    editor: () => editorOf(textbox),
    submit: async () => {
      await form.submit();
      await flushPromises();
    },
  };
}
