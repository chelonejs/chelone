import assert from "node:assert/strict";
import { test } from "node:test";

import { needsUseClient, withUseClient } from "./registry/use-client.mjs";

test("marks a module that calls a hook, createContext, a class component or an on handler prop", () => {
  const sources = [
    "export const Panel = () => { const form = useForm(); return form; };",
    "export const value = useFieldValue<Post, 'title'>(source);",
    "export const Ctx = createContext<number>(0);",
    "export class Boundary extends Component<Props> {}",
    "export class Boundary extends React.PureComponent<Props> {}",
    "export const Save = () => <button onClick={save}>Save</button>;",
  ];
  for (const source of sources) {
    assert.equal(needsUseClient(source), true, source);
  }
});

test("leaves a type-only module, a pure helper, use(promise), user( and reuseCache( unmarked", () => {
  const sources = [
    "export type Props = { title: string; onChange?: (value: string) => void };",
    "export const add = (a: number, b: number) => a + b;",
    "export const read = (promise: Promise<number>) => use(promise);",
    "export const name = user(session);",
    "export const cached = reuseCache(key);",
    'export { useForm } from "./form-hooks";',
    "export const same = a === b && onlineCount == 1;",
  ];
  for (const source of sources) {
    assert.equal(needsUseClient(source), false, source);
  }
});

test("adds the directive once, on line 1, even after a leading comment", () => {
  const source = "// Shows the form.\nexport const Panel = () => useForm();\n";
  const marked = withUseClient(source);
  assert.equal(marked, `"use client";\n${source}`);
  assert.equal(withUseClient(marked), marked);

  const commented = `// Shows the form.\n"use client";\nexport const Panel = () => useForm();\n`;
  assert.equal(withUseClient(commented), commented);

  const pure = "export const add = (a: number, b: number) => a + b;\n";
  assert.equal(withUseClient(pure), pure);
});
