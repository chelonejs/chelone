#!/usr/bin/env node
import process from "node:process";
import { runGen } from "./cli";

// Set exitCode and let the process end, so output queued on a pipe is flushed first.
process.exitCode = await runGen(process.argv.slice(2), {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  cwd: process.cwd(),
});
