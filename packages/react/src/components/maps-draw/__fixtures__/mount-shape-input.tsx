/**
 * Mounts a drawing input in a form under the maps provider, for the tests of
 * the inputs built on `ShapeInput`. The test file mocks `maplibre-gl` and
 * `terra-draw` itself (`vi.mock` is hoisted per file) and calls `resetMaps()`
 * and `resetDraws()` between tests.
 */

import {
  createI18n,
  fakeDataProvider,
  mapMessages,
  type NotificationStore,
  rasterTileStyle,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { act, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { maps } from "../../maps/__fixtures__/fake-maplibre";
import { type MapsConfig, MapsProvider } from "../../maps/maps-provider";
import { draws } from "./fake-terra-draw";

const style = rasterTileStyle({
  tileUrl: "https://tiles.example.test/{z}/{x}/{y}.png",
  attribution: "Example",
});

type Values = { shape: unknown };

/**
 * The input under test gets `source="shape"`; `input` is rendered as given.
 * `config` adds to what `MapsProvider` is given, such as a `router`. A
 * `notifications` store is wired into `CheloneProvider` when given.
 */
export async function mountShapeInput(
  input: ReactElement,
  shape: unknown = null,
  config: Omit<MapsConfig, "mapStyle"> = {},
  notifications?: NotificationStore,
) {
  let current: ReturnType<typeof useForm<Values>> | undefined;
  function FormHost() {
    const form = useForm<Values>({
      defaultValues: { shape },
      save: async () => undefined,
    });
    current = form;
    const value = useSelector(form.form.store, (state) => state.values.shape);
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        {input}
        <output data-testid="value">{JSON.stringify(value)}</output>
      </CheloneFormProvider>
    );
  }
  render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={createI18n({ locale: "en", messages: { en: mapMessages } })}
      notifications={notifications}
    >
      <MapsProvider mapStyle={style} {...config}>
        <FormHost />
      </MapsProvider>
    </CheloneProvider>,
  );
  // Lets the fake map's microtask `load` fire and React render what follows.
  await act(async () => {});
  const draw = () => {
    const instance = draws[draws.length - 1];
    if (!instance) throw new Error("no draw instance");
    return instance;
  };
  await act(async () => draw().emitReady());
  return {
    draw,
    form: () => {
      if (!current) throw new Error("form not mounted");
      return current;
    },
    map: () => {
      const map = maps[0];
      if (!map) throw new Error("no map");
      return map;
    },
  };
}

/** The form value of `source="shape"`, as JSON read back from the page. */
export const storedValue = () =>
  JSON.parse(screen.getByTestId("value").textContent ?? "null");

/** The names of the toolbar buttons, in order. */
export const toolbarNames = () =>
  within(screen.getByRole("toolbar"))
    .getAllByRole("button")
    .map((b) => b.getAttribute("aria-label") ?? "");
