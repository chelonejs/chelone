/**
 * `<SingleFieldList>`: the records of the ambient list as an inline row. The
 * list surface is the `makeListContext` fixture provided directly so the records
 * are exact; assertions are on DOM and on what the slots receive.
 */

import type { LooseRecord } from "@chelone/core";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { makeListContext } from "../../../__fixtures__/list-context";
import { provideListContext } from "../../../list/list-context";
import { useRecordContext } from "../../../record/record-context";
import { provideResourceContext } from "../../../resource-context";
import SingleFieldList from "./single-field-list.vue";

const TAGS: LooseRecord[] = [
  { id: 1, name: "red" },
  { id: 2, name: "green" },
];

function mountList(ui: () => VNodeChild, data: LooseRecord[] | null = TAGS) {
  const Provider = defineComponent({
    setup() {
      provideResourceContext("tags");
      provideListContext(makeListContext({ data: data ?? undefined }));
      return () => ui();
    },
  });
  return mount(Provider);
}

const RecordName = defineComponent({
  setup() {
    const record = useRecordContext<{ name: string }>();
    return () => h("em", record?.name);
  },
});

describe("<SingleFieldList>", () => {
  it("renders one badge per record with the record representation by default", () => {
    const wrapper = mountList(() => h(SingleFieldList));
    const badges = wrapper.findAll('[data-slot="badge"]');
    expect(badges.map((badge) => badge.text())).toEqual(["red", "green"]);
    expect(badges[0]?.attributes("data-variant")).toBe("outline");
  });

  it("renders its default slot once per record with the record in context", () => {
    const wrapper = mountList(() =>
      h(SingleFieldList, null, { default: () => h(RecordName) }),
    );
    expect(wrapper.findAll("em").map((el) => el.text())).toEqual([
      "red",
      "green",
    ]);
  });

  it("the item slot wins over the default slot and receives the record and its index", () => {
    const wrapper = mountList(() =>
      h(SingleFieldList, null, {
        item: ({
          record,
          index,
        }: {
          record: { name?: string };
          index: number;
        }) => h("span", `${index}:${record.name}`),
        default: () => h(RecordName),
      }),
    );
    expect(wrapper.text()).toContain("0:red");
    expect(wrapper.text()).toContain("1:green");
    expect(wrapper.find("em").exists()).toBe(false);
  });

  it("renders nothing while the list has no data", () => {
    const wrapper = mountList(() => h(SingleFieldList), null);
    expect(wrapper.element.nodeType).toBe(Node.COMMENT_NODE);
  });
});
