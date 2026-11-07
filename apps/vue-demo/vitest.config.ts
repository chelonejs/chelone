import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

/**
 * The test mirror of `vite.config.ts`: the Vue plugin compiles the demo's own
 * `.vue` files (and the linked `@chelone/vue` source), and the `@` alias points
 * at this app's `src`. No Tailwind plugin: jsdom applies no CSS.
 */
const appSrc = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@/": `${appSrc}/`,
    },
    dedupe: ["vue", "vue-router", "@tanstack/vue-query"],
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
