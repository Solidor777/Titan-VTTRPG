// Bootstrap: registers the '~/' alias resolve hook (Node's loader-registration idiom — the hook must
// be installed via module.register() before any '~/' import elsewhere in the process resolves), then
// dynamically imports the CLI module so the alias is already active by the time it runs. The dynamic
// import is required by that ordering, not a shipping-build concern: scripts/ is a Node-only CLI
// entry point, never bundled into the dist/ system build the "no dynamic imports in shipping builds"
// rule governs.
import './lib/registerSrcAlias.mjs';

const { runCli } = await import('./lib/spreadsheetToMarkdownCli.mjs');

process.exitCode = await runCli(process.argv.slice(2));
