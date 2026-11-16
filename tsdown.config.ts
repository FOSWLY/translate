import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/errors.ts",
    "./src/config/config.ts",
    "./src/providers/*.ts",
    "./src/types/*.ts",
    "./src/types/providers/*.ts",
  ],
  root: "./src",
  unbundle: true,
  dts: true,
  target: "ESNext",
  hash: false,
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
  suppressWarnings: [/Use of direct `eval`/],
});
