import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { techLogos } from "./tech-logos.data";

const publicDir = path.resolve(__dirname, "../../public");
const labels = techLogos.map((logo) => logo.label);

describe("techLogos", () => {
  it("lists Vue after React and TanStack Form after TanStack Query", () => {
    expect(labels.indexOf("Vue")).toBe(labels.indexOf("React") + 1);
    expect(labels.indexOf("TanStack Form")).toBe(
      labels.indexOf("TanStack Query") + 1,
    );
  });

  it("points every logo at a file in public/img", () => {
    for (const logo of techLogos) {
      expect(logo.src, logo.label).toMatch(/^\/img\//);
      expect(existsSync(path.join(publicDir, logo.src)), logo.label).toBe(true);
    }
  });
});
