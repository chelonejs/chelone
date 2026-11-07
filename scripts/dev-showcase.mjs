// The docs at `/`, the React demo at `/demo/` and the Vue demo at `/vue-demo/`, all on one port,
// since a kelpie worker's browser may open only the one its dev server answers on.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PORT ?? "5373";

const freePort = () =>
  new Promise((resolve) => {
    const probe = createServer().listen(0, () => {
      const { port: free } = probe.address();
      probe.close(() => resolve(String(free)));
    });
  });

const run = (app, appPort, env = {}) =>
  spawn("pnpm", ["--dir", `apps/${app}`, "dev", "--port", appPort, "--strictPort"], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });

const [demoPort, vueDemoPort] = await Promise.all([freePort(), freePort()]);
const apps = [
  run("demo", demoPort),
  run("vue-demo", vueDemoPort),
  run("website", port, { DEMO_PORT: demoPort, VUE_DEMO_PORT: vueDemoPort }),
];

const stop = () => {
  for (const app of apps) app.kill();
};
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, stop);
for (const app of apps) app.once("exit", stop);
