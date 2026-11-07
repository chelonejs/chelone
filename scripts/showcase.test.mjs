import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { componentsIn, docsPageHasDemo, owner, problems, vueDocsShot } from "./showcase.mjs";

const shot = (path) => ({ path });
// `vue.docs` is never written: it is the React docs shot with `?framework=vue`.
const complete = {
  react: { docs: shot("/docs/editing/text-input"), demo: shot("/demo/posts/create") },
  vue: { demo: shot("/vue-demo/posts/create") },
};
const vueDocs = "/docs/editing/text-input?framework=vue";
const components = {
  react: new Map([["text-input", ["packages/react/src/components/admin/inputs/text-input.tsx"]]]),
  vue: new Map([["text-input", ["packages/vue/src/components/admin/inputs/text-input.vue"]]]),
};
const check = (manifest, previous = manifest) => problems({ manifest, previous, components, hasDemo: () => true });

describe("componentsIn", () => {
  it("keeps items that render and leaves out contexts and primitives", () => {
    const items = [
      { name: "a", type: "registry:component", files: [{ path: "src/a.tsx" }] },
      { name: "a-context", type: "registry:component", files: [{ path: "src/a-context.ts" }] },
      { name: "button", type: "registry:ui", files: [{ path: "src/button.tsx" }] },
      { name: "b", type: "registry:block", files: [{ path: "src/b.vue" }] },
    ];
    assert.deepEqual([...componentsIn({ items }, "vue").keys()], ["a", "b"]);
    assert.deepEqual(componentsIn({ items }, "vue").get("a"), ["packages/vue/src/a.tsx"]);
  });
});

describe("vueDocsShot", () => {
  it("is the React docs shot with the framework set", () => {
    assert.deepEqual(vueDocsShot(complete), { path: vueDocs });
  });

  it("leaves an entry that names its own Vue docs shot alone", () => {
    const entry = { ...complete, vue: { ...complete.vue, docs: shot("/docs/vue/own") } };
    assert.deepEqual(vueDocsShot(entry), shot("/docs/vue/own"));
  });

  it("is nothing when the entry has no docs shot at all", () => {
    assert.equal(vueDocsShot({ react: { demo: shot("/demo/posts") } }), undefined);
  });
});

describe("docsPageHasDemo", () => {
  it("reads a query string as the same docs page", () => {
    assert.ok(docsPageHasDemo(vueDocs, "vue"));
    assert.ok(docsPageHasDemo("/docs/editing/text-input", "react"));
  });

  it("asks for the demo of the adapter it is asked for", () => {
    assert.ok(!docsPageHasDemo("/docs/editing/simple-form-iterator", "vue"));
    assert.ok(docsPageHasDemo("/docs/editing/simple-form-iterator", "react"));
    assert.ok(!docsPageHasDemo("/docs/no/such/page", "react"));
  });
});

describe("problems", () => {
  it("passes a complete entry", () => {
    assert.deepEqual(check({ "text-input": complete }), []);
  });

  it("fails a component with no entry", () => {
    assert.deepEqual(check({}), ["text-input has no entry in showcase.json"]);
  });

  it("fails an entry for a component no registry has", () => {
    assert.deepEqual(check({ "text-input": complete, gone: null }), ["gone is in showcase.json but in no registry"]);
  });

  it("lets a component that already owed its entry keep owing it", () => {
    assert.deepEqual(check({ "text-input": null }), []);
  });

  it("lets every entry be owed on the commit that adds the file", () => {
    assert.deepEqual(check({ "text-input": null }, null), []);
  });

  it("fails a new component added as owed", () => {
    assert.match(check({ "text-input": null }, {})[0], /is null/);
  });

  it("fails an entry taken back to owed", () => {
    assert.match(check({ "text-input": null }, { "text-input": complete })[0], /is null/);
  });

  it("fails an entry with no demo in an adapter that has the component", () => {
    const entry = { react: complete.react, vue: {} };
    assert.deepEqual(check({ "text-input": entry }), ["text-input: vue.demo is missing"]);
  });

  it("fails a docs shot in either adapter with nothing to derive it from", () => {
    const entry = { react: { demo: shot("/demo/posts/create") }, vue: { demo: shot("/vue-demo/posts/create") } };
    assert.deepEqual(check({ "text-input": entry }), [
      "text-input: react.docs is missing",
      "text-input: vue.docs is missing",
    ]);
  });

  it("asks for no adapter the component is not in", () => {
    const reactOnly = { react: components.react, vue: new Map() };
    const manifest = { "text-input": { react: complete.react } };
    assert.deepEqual(problems({ manifest, previous: manifest, components: reactOnly, hasDemo: () => true }), []);
  });

  it("fails a docs page with no demo for the adapter it is shot for", () => {
    const manifest = { "text-input": complete };
    const found = problems({ manifest, previous: manifest, components, hasDemo: () => false });
    assert.deepEqual(found, [
      "text-input: react.docs: /docs/editing/text-input has no react demo in its demos folder",
      `text-input: vue.docs: ${vueDocs} has no vue demo in its demos folder`,
    ]);
  });

  it("fails a Vue component whose docs page has no Vue demo", () => {
    const manifest = { "text-input": complete };
    const found = problems({
      manifest,
      previous: manifest,
      components,
      hasDemo: (_page, adapter) => adapter === "react",
    });
    assert.deepEqual(found, [`text-input: vue.docs: ${vueDocs} has no vue demo in its demos folder`]);
  });

  it("accepts a part shown by a component that has an entry", () => {
    const withPart = { ...components, vue: new Map([...components.vue, ["text-input-row", ["x.vue"]]]) };
    const manifest = { "text-input": complete, "text-input-row": { shownBy: "text-input" } };
    assert.deepEqual(problems({ manifest, previous: manifest, components: withPart, hasDemo: () => true }), []);
  });

  it("fails a shownBy with no entry, and one that loops", () => {
    const parts = { react: new Map([["a", []], ["b", []]]), vue: new Map() };
    const dangling = { a: { shownBy: "c" }, b: null };
    const looping = { a: { shownBy: "b" }, b: { shownBy: "a" } };
    const run = (manifest) => problems({ manifest, previous: manifest, components: parts, hasDemo: () => true });
    assert.match(run(dangling)[0], /which has no entry/);
    assert.match(run(looping)[0], /loops/);
  });
});

describe("owner", () => {
  it("follows shownBy to the component that renders", () => {
    assert.equal(owner({ a: { shownBy: "b" }, b: { shownBy: "c" }, c: complete }, "a"), "c");
  });
});
