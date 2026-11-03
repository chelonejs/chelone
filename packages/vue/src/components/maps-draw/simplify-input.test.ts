/**
 * Tests for SimplifyInput. `maplibre-gl` is the stand-in in the `__fixtures__`
 * folder. A test moves the range input as a user would, by setting its value,
 * and reads the form's value from the form store.
 */

import {
  createI18n,
  fakeDataProvider,
  mapMessages,
  rasterTileStyle,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNode } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../admin/admin.vue";
import { type UseFormReturn, useForm } from "../../form/use-form";
import { maps, resetFake } from "../maps/__fixtures__/fake-maplibre";
import { MapsProvider } from "../maps/use-map";
import SimplifyInput from "./simplify-input.vue";

vi.mock("maplibre-gl", () => import("../maps/__fixtures__/fake-maplibre"));

const style = rasterTileStyle({
  tileUrl: "https://tiles.example.test/{z}/{x}/{y}.png",
  attribution: "Example",
});

const mounted: VueWrapper[] = [];

beforeEach(resetFake);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
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
    const to = corners[(i + 1) % 4] as Position;
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
  ring.push(ring[0] as Position);
  return ring;
}

const polygon = (ring: Position[] = bumpySquare()) => ({
  type: "Polygon" as const,
  coordinates: [ring],
});

/** Mounts `input` as the only field of a form under Admin and the maps provider. */
async function mountInput(input: () => VNode, shape: unknown) {
  let current: UseFormReturn<Values> | undefined;
  const FormHost = defineComponent({
    setup() {
      current = useForm<Values>({
        record: { shape },
        onSubmit: async () => undefined,
      });
      return () => input();
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(MapsProvider, { mapStyle: style }, () =>
          h(
            Admin,
            {
              dataProvider: fakeDataProvider({}),
              queryClient: new QueryClient(),
              i18n: createI18n({
                locale: "en",
                messages: { en: mapMessages },
              }),
            },
            { default: () => h(FormHost) },
          ),
        );
    },
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  await flushPromises();
  const form = () => {
    if (!current) throw new Error("form not mounted");
    return current.form;
  };
  return {
    wrapper,
    form,
    value: () => form().store.state.values.shape as unknown,
    /** Ring entries of the stored Polygon. */
    ringLength: () =>
      (form().store.state.values.shape as ReturnType<typeof polygon>)
        .coordinates[0]?.length,
    /** Moves the range input, then lets Vue render what follows. */
    async slide(to: number) {
      await wrapper.get('input[type="range"]').setValue(to);
      await flushPromises();
    },
    async press(name: string) {
      const found = wrapper.findAll("button").find((b) => b.text() === name);
      if (!found) throw new Error(`no button named ${name}`);
      await found.trigger("click");
      await flushPromises();
    },
    async reset(next: unknown) {
      form().reset({ shape: next });
      await flushPromises();
    },
  };
}

const simplifyInput =
  (props: Record<string, unknown> = {}) =>
  () =>
    h(SimplifyInput, { source: "shape", ...props });

describe("SimplifyInput", () => {
  it("keeps all 21 ring entries of a 20 vertex ring at tolerance 0", async () => {
    expect(bumpySquare()).toHaveLength(21);
    const { ringLength, wrapper } = await mountInput(
      simplifyInput({ tolerance: 0 }),
      polygon(),
    );
    expect(ringLength()).toBe(21);
    expect(wrapper.text()).toContain("Tolerance: 0.000");
  });

  it("drops vertices when the slider is raised", async () => {
    const { form, ringLength, slide } = await mountInput(
      simplifyInput({ tolerance: 0 }),
      polygon(),
    );
    expect(form().state.isDirty).toBe(false);
    await slide(0.05);
    expect(ringLength()).toBe(5);
    expect(form().state.isDirty).toBe(true);
  });

  it("restores the original when the slider returns to 0", async () => {
    const { value, ringLength, slide } = await mountInput(
      simplifyInput({ tolerance: 0 }),
      polygon(),
    );
    await slide(0.05);
    expect(ringLength()).toBe(5);
    await slide(0);
    expect(ringLength()).toBe(21);
    expect(value()).toEqual(polygon());
  });

  it("applies the initial tolerance on load", async () => {
    const { ringLength, wrapper } = await mountInput(
      simplifyInput(),
      polygon(),
    );
    expect(ringLength()).toBe(5);
    expect(wrapper.text()).toContain("Tolerance: 0.010");
  });

  it("does not dirty the form when nothing can be removed", async () => {
    const triangle = polygon([
      [0, 0],
      [10, 0],
      [5, 8],
      [0, 0],
    ]);
    const { form, ringLength, slide } = await mountInput(
      simplifyInput(),
      triangle,
    );
    await slide(0.05);
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
    const { ringLength, press } = await mountInput(
      simplifyInput(),
      polygon(ring),
    );
    expect(ringLength()).toBe(5);
    await press("High");
    expect(ringLength()).toBe(6);
    await press("Default");
    expect(ringLength()).toBe(5);
  });

  it("marks the chosen quality as pressed and keeps it when pressed again", async () => {
    const { wrapper, press } = await mountInput(
      simplifyInput({ quality: "High" }),
      polygon(),
    );
    expect(wrapper.find('[role="group"]').exists()).toBe(true);
    const pressed = () =>
      wrapper
        .get('[role="group"]')
        .findAll("button")
        .map((b) => [b.text(), b.attributes("aria-pressed")]);
    expect(pressed()).toEqual([
      ["Default", "false"],
      ["High", "true"],
    ]);
    await press("High");
    expect(pressed()).toEqual([
      ["Default", "false"],
      ["High", "true"],
    ]);
  });

  it("takes a reset value as the new original", async () => {
    const { value, ringLength, slide, reset } = await mountInput(
      simplifyInput({ tolerance: 0 }),
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
    await reset(other);
    expect(ringLength()).toBe(6);
    await slide(0.05);
    expect(ringLength()).toBe(5);
    await slide(0);
    expect(value()).toEqual(other);
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
    const { form, ringLength } = await mountInput(
      simplifyInput({ tolerance: 0 }),
      polygon(ring),
    );
    expect(ringLength()).toBe(6);
    expect(form().state.isDirty).toBe(false);
  });

  it("takes a reloaded value equal to the last write as the new original", async () => {
    const { value, ringLength, slide, reset } = await mountInput(
      simplifyInput(),
      polygon(),
    );
    expect(ringLength()).toBe(5);
    const reloaded = JSON.parse(JSON.stringify(value()));
    await reset(reloaded);
    await slide(0);
    expect(ringLength()).toBe(5);
  });

  it("shows a Feature with a null geometry without crashing", async () => {
    const { wrapper } = await mountInput(simplifyInput(), {
      type: "Feature",
      properties: null,
      geometry: null,
    });
    expect(wrapper.find('input[type="range"]').exists()).toBe(true);
  });

  it("throws for a string value", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(mountInput(simplifyInput(), "POINT(0 0)")).rejects.toThrow(
      "SimplifyInput: source must be GeoJSON or null",
    );
    error.mockRestore();
    warn.mockRestore();
  });

  it("shows the empty state for null and writes nothing", async () => {
    const { form, value, wrapper } = await mountInput(simplifyInput(), null);
    expect(wrapper.text()).toContain("No geometry");
    expect(wrapper.find('input[type="range"]').exists()).toBe(false);
    expect(maps).toHaveLength(0);
    expect(value()).toBeNull();
    expect(form().state.isDirty).toBe(false);
  });

  it("shows the tolerance to three decimals", async () => {
    const { wrapper, slide } = await mountInput(
      simplifyInput({ tolerance: 0.0125, step: 0.0005 }),
      polygon(),
    );
    expect(wrapper.text()).toContain("Tolerance: 0.013");
    await slide(0);
    expect(wrapper.text()).toContain("Tolerance: 0.000");
  });

  it("labels the range input and sets its bounds", async () => {
    const { wrapper } = await mountInput(
      simplifyInput({ minTolerance: 0.002, maxTolerance: 0.2, step: 0.01 }),
      polygon(),
    );
    const range = wrapper.get('input[type="range"]');
    expect(range.attributes("min")).toBe("0.002");
    expect(range.attributes("max")).toBe("0.2");
    expect(range.attributes("step")).toBe("0.01");
    const label = wrapper.get(`label[for="${range.attributes("id")}"]`);
    expect(label.text()).toBe("Tolerance: 0.010");
  });

  it("renders no legend for an empty label", async () => {
    const { wrapper } = await mountInput(
      simplifyInput({ label: "" }),
      polygon(),
    );
    expect(wrapper.find("legend").exists()).toBe(false);
  });

  it("renders a legend, the helper text and the slot", async () => {
    const { wrapper } = await mountInput(
      simplifyInput({ label: "Outline", helperText: "Thin it" }),
      polygon(),
    );
    expect(wrapper.get("legend").text()).toContain("Outline");
    expect(wrapper.text()).toContain("Thin it");
    expect(wrapper.find("fieldset[data-slot='simplify-input']").exists()).toBe(
      true,
    );
  });
});
