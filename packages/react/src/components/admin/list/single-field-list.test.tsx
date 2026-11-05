/**
 * `<SingleFieldList>`: the records of the ambient list as an inline row. The
 * list surface is a `ListContextProvider` value so the records are exact;
 * assertions are on DOM and on what children and `render` receive.
 */
import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { makeListContext } from "../../../__fixtures__/list-context";
import { CheloneProvider } from "../../../context";
import { ListContextProvider } from "../../../form";
import { useRecordContext } from "../../../record/record-context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { SingleFieldList } from "./single-field-list";

afterEach(cleanup);

interface TagRecord {
  id: number;
  name: string;
}

const TAGS: TagRecord[] = [
  { id: 1, name: "red" },
  { id: 2, name: "green" },
];

function mount(ui: ReactNode, data: TagRecord[] | null = TAGS) {
  const registry = createResourceRegistry();
  registry.register({
    name: "tags",
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: false,
  });
  const value = makeListContext<TagRecord>({ data: data ?? undefined });
  return render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={createI18n({
        locale: "en",
        messages: { en: defineMessages({}) },
      })}
    >
      <ResourceRegistryProvider registry={registry}>
        <ResourceContextProvider value="tags">
          <ListContextProvider value={value}>{ui}</ListContextProvider>
        </ResourceContextProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>,
  );
}

function RecordName() {
  const record = useRecordContext<{ name: string }>();
  return <em>{record?.name}</em>;
}

describe("<SingleFieldList>", () => {
  it("renders one badge per record with the record representation by default", () => {
    const { container } = mount(<SingleFieldList />);
    const badges = container.querySelectorAll('[data-slot="badge"]');
    expect([...badges].map((badge) => badge.textContent)).toEqual([
      "red",
      "green",
    ]);
  });

  it("renders its children once per record with the record in context", () => {
    const { container } = mount(
      <SingleFieldList>
        <RecordName />
      </SingleFieldList>,
    );
    expect(
      [...container.querySelectorAll("em")].map((el) => el.textContent),
    ).toEqual(["red", "green"]);
  });

  it("render wins over children and receives the record and its index", () => {
    const { container } = mount(
      <SingleFieldList<{ id: number; name: string }>
        render={(record, index) => <span>{`${index}:${record.name}`}</span>}
      >
        <RecordName />
      </SingleFieldList>,
    );
    expect(screen.getByText("0:red")).toBeTruthy();
    expect(screen.getByText("1:green")).toBeTruthy();
    expect(container.querySelector("em")).toBeNull();
  });

  it("renders nothing while the list has no data", () => {
    const { container } = mount(<SingleFieldList />, null);
    expect(container.firstChild).toBeNull();
  });
});
