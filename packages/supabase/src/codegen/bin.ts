#!/usr/bin/env node
import { argv, cwd, exit, stderr, stdout } from "node:process";
import { runGen } from "./cli";

const code = await runGen(argv.slice(2), {
  stdout: (text) => stdout.write(text),
  stderr: (text) => stderr.write(text),
  cwd: cwd(),
});
exit(code);
