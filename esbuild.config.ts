import { build } from "esbuild";
import { cpSync } from "node:fs";

async function run(): Promise<void> {
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

  // Copy static assets to dist
  cpSync("src/shell/manifest.json", "dist/manifest.json");
  cpSync("src/shell/options.html", "dist/options.html");

  console.log("Build complete → dist/");
}

void run();
