import path from "node:path";
import { $ } from "bun";
import { GenX } from "@toil/typebox-genx";

import { name } from "../package.json";

async function build() {
  console.log(`Building ${name}...`);
  $.cwd("./");
  await $`rm -rf dist`;
  await $`tsc --project tsconfig.build.json --outdir ./dist && tsc-alias -p tsconfig.build.json && tsc-esm-fix --tsconfig tsconfig.build.json`;
  const packagePath = path.join(__dirname, "..");
  const genx = new GenX({
    root: packagePath,
  });
  await $`mkdir dist/typebox`;
  await genx.generateByDir(
    path.resolve(packagePath, "src", "types"),
    path.resolve(packagePath, "dist", "typebox"),
  );
  $.cwd("./");
}

await build();
