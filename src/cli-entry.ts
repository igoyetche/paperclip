/**
 * Composition root for the CLI entry point
 * Implements Task 9, Step 9.4
 *
 * Reads argv, calls run(), sets process exit code, handles synchronous errors from argument parsing.
 */

import { parseArgs, run, printHelp, printVersion } from "./application/cli.js";

async function main(): Promise<void> {
  try {
    const parsed = parseArgs(process.argv.slice(2));

    // Handle help and version flags
    if (parsed.values.help) {
      printHelp();
      process.exit(0);
    }

    if (parsed.values.version) {
      await printVersion();
      process.exit(0);
    }

    // Run the main CLI
    const exitCode = await run(parsed.values);
    process.exit(exitCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Uncaught error in main:", error);
  process.exit(1);
});
