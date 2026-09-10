import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAncestors, pickWatchPid, superviseServer } from './lib/superviseServer.mjs';

// Playwright's `webServer.command`. Launches the Foundry server that owns this system's install when nothing
// answers on the Foundry port, and reuses an already-running server otherwise. A launched server is killed
// when Playwright ends the run (normal completion, failure, Ctrl+C) and, because Playwright cannot clean up
// after being killed hard, whenever the Playwright runner process itself disappears.

/** @type {string} The system repository root (…/foundryuserdata/Data/systems/titan). */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string} The Foundry user-data directory: three levels above the system folder unless overridden. */
const dataPath = process.env.FOUNDRY_DATA_PATH ?? path.resolve(repoRoot, '..', '..', '..');

/** @type {string} The Foundry application directory (holds main.js): a sibling of the data directory. */
const appDir = process.env.FOUNDRY_APP_DIR ?? path.resolve(dataPath, '..', 'foundry');

/** @type {number} The port Foundry binds (its options.json default is 30000). */
const port = Number(process.env.FOUNDRY_PORT ?? 30000);

/** @type {string} The world Foundry launches on start, so a fresh server lands on the join screen the specs expect. */
const world = process.env.FOUNDRY_WORLD ?? 'test-titan';

/** @type {number | undefined} The Playwright runner: the nearest non-shell ancestor, or the parent when run by hand. */
const watchPid = pickWatchPid(getAncestors(process.pid)) ?? process.ppid;

/** @type {import('./lib/superviseServer.mjs').SuperviseHandle} The supervised server. */
const handle = await superviseServer({
   command: process.execPath,
   args: ['main.js', `--dataPath=${dataPath}`, `--world=${world}`],
   cwd: appDir,
   port,
   watchPid,
});

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
   process.on(signal, () => handle.stop());
}
process.on('exit', () => handle.stop());

process.exitCode = await handle.done;
