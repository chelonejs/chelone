/**
 * V3-c Task 3 gate probes for the `common/` helper surface:
 * `<FieldLabelText>` humanizes/translates a field label (+ required marker),
 * `<InputHelperText>` translates + wraps helper text (and passes a slot node
 * raw), and `<KeyboardShortcut>` renders `<kbd>` glyphs from a shortcut string.
 * The label helpers read the ambient i18n / resource / source scope, so they
 * mount under a minimal `provideCheloneContext` (+ optional resource) harness;
 * `<KeyboardShortcut>` is pure presentation and needs no context.
 */

import {
  type AnyCheloneI18n,
  createI18n,
  fakeDataProvider,
} from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { provideCheloneContext } from "../../context";
import { provideResourceContext } from "../../resource-context";
import FieldLabelText from "./common/field-label-text.vue";
import InputHelperText from "./common/input-helper-text.vue";
import KeyboardShortcut from "./common/keyboard-shortcut.vue";

interface HarnessOptions {
  i18n?: AnyCheloneI18n;
  resource?: string;
}

/** Mount `render` under a minimal Chelone context (no `<Admin>`/router). */
function mountCommon(render: () => VNodeChild, options: HarnessOptions = {}) {
  const dataProvider = fakeDataProvider({});
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Harness = defineComponent({
    setup() {
      provideCheloneContext({ dataProvider, queryClient, i18n: options.i18n });
      if (options.resource) provideResourceContext(options.resource);
      return () => render();
    },
  });
  return mount(Harness);
}

describe("<FieldLabelText>", () => {
  it("humanizes a snake_case source when no label/i18n is present", () => {
    const wrapper = mountCommon(() =>
      h(FieldLabelText, { source: "author_name" }),
    );
    expect(wrapper.text()).toBe("Author name");
  });

  it("strips a trailing _id in the humanized fallback", () => {
    const wrapper = mountCommon(() =>
      h(FieldLabelText, { source: "author_id" }),
    );
    expect(wrapper.text()).toBe("Author");
  });

  it("derives the humanized default from the suffix after the last index", () => {
    const wrapper = mountCommon(() =>
      h(FieldLabelText, { source: "tags.0.url" }),
    );
    expect(wrapper.text()).toBe("Url");
  });

  it("translates an explicit string label", () => {
    const i18n = createI18n({
      locale: "en",
      messages: { en: { "my.label": "My Label" } },
    });
    const wrapper = mountCommon(
      () => h(FieldLabelText, { label: "my.label" }),
      {
        i18n,
      },
    );
    expect(wrapper.text()).toBe("My Label");
  });

  it("echoes an explicit string label with no matching translation", () => {
    const wrapper = mountCommon(() =>
      h(FieldLabelText, { label: "Plain Label" }),
    );
    expect(wrapper.text()).toBe("Plain Label");
  });

  it("translates via the resource field key when present", () => {
    const i18n = createI18n({
      locale: "en",
      messages: { en: { "resources.posts.fields.title": "Post Title" } },
    });
    const wrapper = mountCommon(
      () => h(FieldLabelText, { source: "title", resource: "posts" }),
      { i18n },
    );
    expect(wrapper.text()).toBe("Post Title");
  });

  it("resolves the resource from the ambient ResourceContext", () => {
    const i18n = createI18n({
      locale: "en",
      messages: { en: { "resources.comments.fields.body": "Comment Body" } },
    });
    const wrapper = mountCommon(() => h(FieldLabelText, { source: "body" }), {
      i18n,
      resource: "comments",
    });
    expect(wrapper.text()).toBe("Comment Body");
  });

  it("renders nothing when label is false", () => {
    const wrapper = mountCommon(() =>
      h(FieldLabelText, { source: "title", label: false }),
    );
    expect(wrapper.text()).toBe("");
    expect(wrapper.find("span").exists()).toBe(false);
  });

  it("appends a required marker when isRequired", () => {
    const wrapper = mountCommon(() =>
      h(FieldLabelText, { source: "title", isRequired: true }),
    );
    expect(wrapper.text()).toContain("Title");
    expect(wrapper.text()).toContain("*");
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true);
  });

  it("renders a default slot verbatim (custom node), skipping translation", () => {
    const wrapper = mountCommon(() =>
      h(FieldLabelText, { source: "title" }, () => h("em", "Custom")),
    );
    expect(wrapper.find("em").exists()).toBe(true);
    expect(wrapper.text()).toBe("Custom");
  });
});

describe("<InputHelperText>", () => {
  it("renders a string helper inside a FieldDescription", () => {
    const wrapper = mountCommon(() =>
      h(InputHelperText, { helperText: "Enter your name" }),
    );
    const desc = wrapper.find('[data-slot="field-description"]');
    expect(desc.exists()).toBe(true);
    expect(desc.text()).toBe("Enter your name");
  });

  it("translates a helper-text key", () => {
    const i18n = createI18n({
      locale: "en",
      messages: { en: { "help.name": "Your full name" } },
    });
    const wrapper = mountCommon(
      () => h(InputHelperText, { helperText: "help.name" }),
      { i18n },
    );
    expect(wrapper.text()).toBe("Your full name");
  });

  it("renders nothing when helperText is false", () => {
    const wrapper = mountCommon(() =>
      h(InputHelperText, { helperText: false }),
    );
    expect(wrapper.find('[data-slot="field-description"]').exists()).toBe(
      false,
    );
    expect(wrapper.text()).toBe("");
  });

  it("renders nothing when helperText is absent", () => {
    const wrapper = mountCommon(() => h(InputHelperText));
    expect(wrapper.text()).toBe("");
  });

  it("renders a default slot node raw (no FieldDescription wrapper)", () => {
    const wrapper = mountCommon(() =>
      h(InputHelperText, {}, () => h("span", { class: "custom-help" }, "Hint")),
    );
    expect(wrapper.find(".custom-help").exists()).toBe(true);
    expect(wrapper.find('[data-slot="field-description"]').exists()).toBe(
      false,
    );
  });
});

describe("<KeyboardShortcut>", () => {
  it("renders a kbd per key with glyph mapping", () => {
    const wrapper = mount(KeyboardShortcut, {
      props: { keyboardShortcut: "mod+k" },
    });
    const kbds = wrapper.findAll("kbd");
    expect(kbds).toHaveLength(2);
    expect(defined(kbds[0]).text()).toBe("⌘");
    expect(defined(kbds[1]).text()).toBe("K");
  });

  it("renders sequential chords split by >", () => {
    const wrapper = mount(KeyboardShortcut, {
      props: { keyboardShortcut: "a>b" },
    });
    const kbds = wrapper.findAll("kbd");
    expect(kbds).toHaveLength(2);
    expect(defined(kbds[0]).text()).toBe("A");
    expect(defined(kbds[1]).text()).toBe("B");
  });

  it("renders nothing without a shortcut", () => {
    const wrapper = mount(KeyboardShortcut, { props: {} });
    expect(wrapper.find("div").exists()).toBe(false);
    expect(wrapper.find("kbd").exists()).toBe(false);
  });
});
