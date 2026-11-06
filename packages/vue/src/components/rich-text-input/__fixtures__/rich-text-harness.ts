import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import type { Editor } from "@tiptap/core";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeAll, expect, type Mock, vi } from "vitest";
import { defineComponent, h, reactive, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { type UseFormReturn, useForm } from "../../../form/use-form";
import RichTextInput, { type RichTextInputProps } from "../rich-text-input.vue";

// ProseMirror measures the DOM while it scrolls the selection into view,
// which jsdom has no layout for.
beforeAll(() => {
  const rect = new DOMRect(0, 0, 0, 0);
  const rects = Object.assign([], { item: () => null });
  Range.prototype.getClientRects = () => rects;
  Range.prototype.getBoundingClientRect = () => rect;
  Element.prototype.getClientRects = () => rects;
  document.elementFromPoint = () => null;
});

const mounted: { unmount(): void }[] = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

interface FormValues {
  body?: string;
}

/**
 * Mounts the input under `<Admin>` with a `useForm` host and waits for its
 * editor, which tiptap creates when the component mounts.
 */
interface MountedInput {
  wrapper: VueWrapper;
  form: UseFormReturn<FormValues>;
  onSubmit: Mock<(data: FormValues) => Promise<undefined>>;
  setProps: (next: Partial<RichTextInputProps>) => void;
  editor: () => Editor;
  dom: () => HTMLElement;
}
export async function mountInput(
  props: Partial<RichTextInputProps> = {},
  {
    body = "",
    slots,
  }: {
    body?: string;
    slots?: Record<string, (scope: { editor: Editor }) => VNodeChild>;
  } = {},
): Promise<MountedInput> {
  const created: { editor: Editor | null } = { editor: null };
  const live = reactive<Partial<RichTextInputProps>>({ ...props });
  const captured: { form?: UseFormReturn<FormValues> } = {};
  const onSubmit: Mock<(data: FormValues) => Promise<undefined>> = vi.fn(
    async () => undefined,
  );
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const FormHost = defineComponent({
    setup() {
      captured.form = useForm<FormValues>({
        record: { body },
        onSubmit,
      });
      return () =>
        h(
          RichTextInput,
          {
            source: "body",
            ...live,
            editorOptions: {
              ...props.editorOptions,
              onCreate: (event) => {
                created.editor = event.editor;
                props.editorOptions?.onCreate?.(event);
              },
            },
          },
          slots,
        );
    },
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        {
          dataProvider: fakeDataProvider({}),
          queryClient: new QueryClient(),
          i18n: createI18n({
            locale: "en",
            messages: {
              en: defineMessages({ "chelone.validation.required": "Required" }),
            },
          }),
        },
        { default: () => h(FormHost) },
      ),
  });
  const wrapper = mount(Harness, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  await vi.waitFor(() =>
    expect(wrapper.find('[role="textbox"]').exists()).toBe(true),
  );
  await flushPromises();
  return {
    wrapper,
    form: defined(captured.form),
    onSubmit,
    /** Changes props on the mounted input. */
    setProps: (next: Partial<RichTextInputProps>) => Object.assign(live, next),
    editor: (): Editor => defined(created.editor),
    dom: () => elementOf(wrapper.get('[role="textbox"]').element, HTMLElement),
  };
}
