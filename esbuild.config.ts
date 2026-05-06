import { build } from "esbuild";
import { cpSync } from "node:fs";

async function run(): Promise<void> {
  // Build extension bundles (Chrome 120, ES modules)
  await build({
    entryPoints: [
      "src/application/content-script.ts",
      "src/application/background.ts",
      "src/shell/options.ts",
    ],
    bundle: true,
    outdir: "dist",
    format: "esm",
    target: "chrome120",
    minify: false,
    sourcemap: true,
    outExtension: { ".js": ".js" },
    entryNames: "[name]",
  });

  // Build CLI bundle (Node 22, ESM)
  await build({
    entryPoints: ["src/cli-entry.ts"],
    bundle: true,
    outdir: "dist",
    format: "esm",
    target: "node22",
    platform: "node",
    minify: false,
    sourcemap: true,
    outExtension: { ".js": ".js" },
    outbase: "src",
    entryNames: "cli",
    external: [
      "jsdom",
      "robots-parser",
      "node:util",
      "node:fs",
      "node:path",
      "node:fs/promises",
      "node:stream",
      "node:zlib",
    ],
  });

  // Copy static assets to dist
  cpSync("src/shell/manifest.json", "dist/manifest.json");
  cpSync("src/shell/options.html", "dist/options.html");
  cpSync("src/shell/icons", "dist", { recursive: true });

  console.log("Build complete → dist/");
}

void run();
