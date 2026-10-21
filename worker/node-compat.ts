import { createRequire } from "node:module";

// Bundled CommonJS dependencies require Node built-ins. Workers supplies those
// built-ins through createRequire, while ESM has no ambient require function.
const globals = globalThis as typeof globalThis & { require?: NodeJS.Require };
globals.require ??= createRequire(import.meta.url);
