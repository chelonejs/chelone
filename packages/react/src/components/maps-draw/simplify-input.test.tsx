/**
 * Tests for SimplifyInput. `maplibre-gl` is the stand-in in the `__fixtures__`
 * folder. A test moves the slider with the keyboard, as a user would, and
 * reads the form's value back from the page.
 */

import {
  createI18n,
  fakeDataProvider,
  mapMessages,
  rasterTileStyle,
} from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../context";
import { CheloneFormProvider } from "../../form-context";
import { useForm } from "../../form-hooks";
import { maps, resetFake } from "../maps/__fixtures__/fake-maplibre";
import { MapsProvider } from "../maps/maps-provider";
import { SimplifyInput } from "./simplify-input";

vi.mock("maplibre-gl", () => import("../maps/__fixtures__/fake-maplibre"));

beforeEach(resetFake);
afterEach(cleanup);

const style = rasterTileStyle({
  tileUrl: "https://tiles.example.test/{z}/{x}/{y}.png",
  attribution: "Example",
});

type Values = { shape: unknown };
type Position = [number, number];

/** A square of side 10 with 4 vertices on each side, each 0.004 off the side. */
function bumpySquare(): Position[] {
  const corners: Position[] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];
  const ring: Position[] = [];
  corners.forEach((from, i) => {
    const to = defined(corners[(i + 1) % 4]);
    ring.push(from);
    for (let step = 1; step <= 4; step++) {
      const t = step / 5;
      const x = from[0] + (to[0] - from[0]) * t;
      const y = from[1] + (to[1] - from[1]) * t;
      // Alternating sides, so no three vertices are collinear.
      const bump = step % 2 === 0 ? 0.004 : -0.004;
      ring.push(from[1] === to[1] ? [x, y + bump] : [x + bump, y]);
    }
  });
  ring.push(defined(ring[0]));
  return ring;
}

const polygon = (ring: Position[] = bumpySquare()) => ({
  type: "Polygon" as const,
  coordinates: [ring],
});

/** Ring entries of the stored Polygon. */
function ringLength(): number {
  const value = JSON.parse(screen.getByTestId("value").textContent ?? "null");
  return value.coordinates[0].length;
}

async function mount(input: ReactElement, shape: unknown) {
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
    >
      <MapsProvider mapStyle={style}>
        <FormHost />
      </MapsProvider>
    </CheloneProvider>,
  );
  await act(async () => {});
  return {
    form: () => {
      if (!current) throw new Error("form not mounted");
      return current.form;
    },
  };
}

const slider = () => screen.getByRole("slider");
const key = (name: string) => fireEvent.keyDown(slider(), { key: name });

describe("SimplifyInput", () => {
  it("does not fit a value outside the longitude and latitude range", async () => {
    await mount(<SimplifyInput source="shape" tolerance={0} />, {
      type: "Point",
      coordinates: [261845, 6250566],
    });

    expect(maps[0]?.fits).toHaveLength(0);
  });

  it("fits a value inside the range", async () => {
    await mount(<SimplifyInput source="shape" tolerance={0} />, polygon());

    expect(maps[0]?.fits).toHaveLength(1);
  });

  it("keeps all 21 ring entries of a 20 vertex ring at tolerance 0", async () => {
    expect(bumpySquare()).toHaveLength(21);
    await mount(<SimplifyInput source="shape" tolerance={0} />, polygon());
    expect(ringLength()).toBe(21);
    expect(screen.getByText("Tolerance: 0.000")).toBeTruthy();
  });

  it("drops vertices when the slider is raised", async () => {
    const { form } = await mount(
      <SimplifyInput source="shape" tolerance={0} />,
      polygon(),
    );
    expect(form().state.isDirty).toBe(false);
    act(() => key("End"));
    expect(ringLength()).toBe(5);
    expect(form().state.isDirty).toBe(true);
  });

  it("restores the original when the slider returns to 0", async () => {
    await mount(<SimplifyInput source="shape" tolerance={0} />, polygon());
    act(() => key("End"));
    expect(ringLength()).toBe(5);
    act(() => key("Home"));
    expect(ringLength()).toBe(21);
    expect(JSON.parse(screen.getByTestId("value").textContent ?? "")).toEqual(
      polygon(),
    );
  });

  it("applies the initial tolerance on load", async () => {
    await mount(<SimplifyInput source="shape" />, polygon());
    expect(ringLength()).toBe(5);
    expect(screen.getByText("Tolerance: 0.010")).toBeTruthy();
  });

  it("does not dirty the form when nothing can be removed", async () => {
    const triangle = polygon([
      [0, 0],
      [10, 0],
      [5, 8],
      [0, 0],
    ]);
    const { form } = await mount(<SimplifyInput source="shape" />, triangle);
    act(() => key("End"));
    expect(ringLength()).toBe(4);
    expect(form().state.isDirty).toBe(false);
  });

  it("simplifies again from the original when quality changes to High", async () => {
    // At 0.01 Default drops both bumps at x=0.5, High keeps the second.
    const ring: Position[] = [
      [0, 0],
      [0.5, 0.008],
      [0.5, 0.016],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ];
    await mount(<SimplifyInput source="shape" />, polygon(ring));
    expect(ringLength()).toBe(5);
    fireEvent.click(screen.getByRole("radio", { name: "High" }));
    expect(ringLength()).toBe(6);
    fireEvent.click(screen.getByRole("radio", { name: "Default" }));
    expect(ringLength()).toBe(5);
  });

  it("keeps the quality when the toggle is pressed off", async () => {
    await mount(<SimplifyInput source="shape" quality="High" />, polygon());
    const high = screen.getByRole("radio", { name: "High" });
    expect(high.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(high);
    expect(
      screen.getByRole("radio", { name: "High" }).getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("takes a reset value as the new original", async () => {
    const { form } = await mount(
      <SimplifyInput source="shape" tolerance={0} />,
      polygon(),
    );
    const other = polygon([
      [0, 0],
      [4, 0],
      [4, 4],
      [2, 4.004],
      [0, 4],
      [0, 0],
    ]);
    act(() => form().reset({ shape: other }));
    expect(ringLength()).toBe(6);
    act(() => key("End"));
    expect(ringLength()).toBe(5);
    act(() => key("Home"));
    expect(JSON.parse(screen.getByTestId("value").textContent ?? "")).toEqual(
      other,
    );
  });

  it("does not change a ring with a collinear vertex at tolerance 0", async () => {
    const ring: Position[] = [
      [0, 0],
      [5, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ];
    const { form } = await mount(
      <SimplifyInput source="shape" tolerance={0} />,
      polygon(ring),
    );
    expect(ringLength()).toBe(6);
    expect(form().state.isDirty).toBe(false);
  });

  it("takes a reloaded value equal to the last write as the new original", async () => {
    const { form } = await mount(<SimplifyInput source="shape" />, polygon());
    expect(ringLength()).toBe(5);
    const reloaded = JSON.parse(screen.getByTestId("value").textContent ?? "");
    act(() => form().reset({ shape: reloaded }));
    act(() => key("Home"));
    expect(ringLength()).toBe(5);
  });

  it("shows a Feature with a null geometry without crashing", async () => {
    await mount(<SimplifyInput source="shape" />, {
      type: "Feature",
      properties: null,
      geometry: null,
    });
    expect(screen.getByRole("slider")).toBeTruthy();
  });

  it("throws for a string value", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      mount(<SimplifyInput source="shape" />, "POINT(0 0)"),
    ).rejects.toThrow("SimplifyInput: source must be GeoJSON or null");
    error.mockRestore();
  });

  it("shows the empty state for null and writes nothing", async () => {
    const { form } = await mount(<SimplifyInput source="shape" />, null);
    expect(screen.getByText("No geometry")).toBeTruthy();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(maps).toHaveLength(0);
    expect(screen.getByTestId("value").textContent).toBe("null");
    expect(form().state.isDirty).toBe(false);
  });

  it("shows the tolerance to three decimals", async () => {
    await mount(
      <SimplifyInput source="shape" tolerance={0.0125} step={0.0005} />,
      polygon(),
    );
    expect(screen.getByText("Tolerance: 0.013")).toBeTruthy();
    act(() => key("Home"));
    expect(screen.getByText("Tolerance: 0.000")).toBeTruthy();
  });

  it("moving the slider with a non-input event target changes nothing", async () => {
    const { form } = await mount(
      <SimplifyInput source="shape" tolerance={0} />,
      polygon(),
    );
    // The slider is a Radix primitive: its value arrives through
    // `onValueChange`, never through an event target.
    const thumb = slider();
    const inner = document.createElement("span");
    thumb.append(inner);
    fireEvent(inner, new Event("input", { bubbles: true }));
    await act(async () => {});
    expect(screen.getByText("Tolerance: 0.000")).toBeTruthy();
    expect(ringLength()).toBe(21);
    expect(form().state.isDirty).toBe(false);
  });

  it("renders a legend, the helper text and the slot", async () => {
    await mount(
      <SimplifyInput source="shape" label="Outline" helperText="Thin it" />,
      polygon(),
    );
    expect(screen.getByText("Outline")).toBeTruthy();
    expect(screen.getByText("Thin it")).toBeTruthy();
    expect(document.querySelector('[data-slot="simplify-input"]')).toBeTruthy();
  });
});
