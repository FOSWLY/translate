import path from "node:path";
import fs from "node:fs/promises";

import { $ } from "bun";

import { name } from "../package.json";

const root = path.join(__dirname, "..");
const distPath = path.join(root, "dist");

async function build() {
  console.log(`Building ${name}...`);
  $.cwd("./");
  await fs.rm(distPath, {
    recursive: true,
    force: true,
  });

  await $`bun run build:default`;
  $.cwd("./");
}

await build();
