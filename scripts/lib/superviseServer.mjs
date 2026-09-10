import { spawn, spawnSync, execFileSync } from 'node:child_process';
import net from 'node:net';

/**
 * @typedef {object} SuperviseOptions
 * @property {string} command - The executable to spawn when no server answers on the port.
 * @property {string[]} args - Arguments for the executable.
 * @property {string} cwd - Working directory for the spawned server.
 * @property {number} port - The port the server binds; a listener already present means "reuse".
 * @property {string} [host] - The host probed for an existing listener (default 127.0.0.1).
 * @property {number} [watchPid] - A process whose death must take the server down with it.
 * @property {number} [pollMs] - How often the watched process is checked for liveness (default 1000).
 * @property {(message: string) => void} [log] - Sink for status lines (default stderr).
 */

/**
 * @typedef {object} SuperviseHandle
 * @property {import('node:child_process').ChildProcess | null} child - The spawned server, or null when an
 *    existing listener was reused and nothing was spawned.
 * @property {() => void} stop - Kills the spawned server tree (no-op when nothing was spawned) and settles
 *    `done`.
 * @property {Promise<number>} done - Resolves with the exit code to report: the server's own code, 0 when
 *    the watched process died or `stop()` was called, and never (until `stop()`) in reuse mode.
 */

/**
 * Whether a process with the given id exists. Signal 0 probes without delivering anything; EPERM means the
 * process exists but belongs to another user, which still counts as alive.
 * @param {number} pid - The process id to probe.
 * @returns {boolean} True when the process exists.
 */
export function isAlive(pid) {
   try {
      process.kill(pid, 0);
      return true;
   }
   catch (error) {
      return error.code === 'EPERM';
   }
}

/**
 * Whether something already accepts TCP connections on the host/port.
 * @param {string} host - The host to connect to.
 * @param {number} port - The port to connect to.
 * @param {number} [timeoutMs] - Connection timeout (default 1000).
 * @returns {Promise<boolean>} True when a connection succeeds.
 */
export function isPortInUse(host, port, timeoutMs = 1000) {
   return new Promise((resolve) => {
      /** @type {net.Socket} The probe socket, destroyed on every outcome. */
      const socket = net.connect({ host, port });

      /**
       * Settles the probe once and releases the socket.
       * @param {boolean} inUse - Whether the connection succeeded.
       * @returns {void}
       */
      const settle = (inUse) => {
         socket.destroy();
         resolve(inUse);
      };

      socket.setTimeout(timeoutMs);
      socket.once('connect', () => settle(true));
      socket.once('timeout', () => settle(false));
      socket.once('error', () => settle(false));
   });
}

/**
 * Kills a process and everything it spawned. Windows has no process groups, so `taskkill /T` walks the
 * tree; elsewhere SIGTERM reaches the direct child, which is the server itself because it is spawned
 * without a shell.
 * @param {import('node:child_process').ChildProcess} child - The process to kill.
 * @returns {void}
 */
export function killTree(child) {
   if (child.exitCode !== null || child.signalCode !== null || !child.pid) {
      return;
   }

   if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      return;
   }

   child.kill('SIGTERM');
}

/**
 * Returns the ancestor chain of a process as `{ pid, name }` entries, nearest parent first, stopping at the
 * root or after `maxDepth` levels. One PowerShell (Windows) or a few `ps` calls (elsewhere).
 * @param {number} pid - The process whose ancestors are listed.
 * @param {number} [maxDepth] - Maximum number of ancestors to return (default 8).
 * @returns {{ pid: number, name: string }[]} The ancestors, nearest first.
 */
export function getAncestors(pid, maxDepth = 8) {
   if (process.platform === 'win32') {
      /** @type {string} A PowerShell loop emitting `pid<TAB>name` per ancestor. */
      const script = [
         `$id = ${pid}; $depth = 0`,
         `while ($id -and $depth -lt ${maxDepth}) {`,
         "   $p = Get-CimInstance Win32_Process -Filter \"ProcessId=$id\" -ErrorAction SilentlyContinue",
         '   if (-not $p) { break }',
         '   $id = $p.ParentProcessId',
         '   if (-not $id) { break }',
         "   $parent = Get-CimInstance Win32_Process -Filter \"ProcessId=$id\" -ErrorAction SilentlyContinue",
         '   if (-not $parent) { break }',
         '   "$($parent.ProcessId)`t$($parent.Name)"',
         '   $depth++',
         '}',
      ].join('; ');

      /** @type {string} The raw PowerShell output. */
      const output = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
         encoding: 'utf8',
         stdio: ['ignore', 'pipe', 'ignore'],
      });

      return output
         .split(/\r?\n/)
         .filter((line) => line.includes('\t'))
         .map((line) => {
            const [id, name] = line.split('\t');
            return { pid: Number(id), name: name.trim() };
         });
   }

   /** @type {{ pid: number, name: string }[]} The ancestors collected from `ps`. */
   const ancestors = [];

   /** @type {number} The process whose parent is looked up next. */
   let current = pid;

   for (let depth = 0; depth < maxDepth; depth++) {
      /** @type {string} `ppid comm` for the current process, empty when it no longer exists. */
      let line = '';
      try {
         line = execFileSync('ps', ['-o', 'ppid=,comm=', '-p', String(current)], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
         }).trim();
      }
      catch {
         break;
      }

      /** @type {number} The parent id parsed from the `ps` line. */
      const parentPid = Number(line.split(/\s+/)[0]);
      if (!parentPid || parentPid <= 1) {
         break;
      }

      /** @type {string} The parent's command name. */
      let parentName = '';
      try {
         parentName = execFileSync('ps', ['-o', 'comm=', '-p', String(parentPid)], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
         }).trim();
      }
      catch {
         break;
      }

      ancestors.push({ pid: parentPid, name: parentName });
      current = parentPid;
   }

   return ancestors;
}

/** @type {RegExp} Command names that are shells or console hosts, never the process that owns a run. */
const SHELL_NAME = /^(cmd(\.exe)?|conhost(\.exe)?|sh|bash(\.exe)?|zsh|fish|dash|pwsh(\.exe)?|powershell(\.exe)?)$/i;

/**
 * Picks the process whose death should take the server down: the nearest ancestor that is not a shell.
 * Playwright's `webServer` runs its command through a shell, so the immediate parent is `cmd.exe`/`sh` and
 * the process one level up is the Playwright runner itself.
 * @param {{ pid: number, name: string }[]} ancestors - The ancestor chain, nearest first.
 * @returns {number | undefined} The pid to watch, or undefined when every ancestor is a shell.
 */
export function pickWatchPid(ancestors) {
   return ancestors.find((entry) => !SHELL_NAME.test(entry.name))?.pid;
}

/**
 * Starts the server unless one already listens on the port, and guarantees the started server dies with
 * the run: on the watched process disappearing, on `stop()`, or on the server exiting by itself.
 * @param {SuperviseOptions} options - What to run and what to watch.
 * @returns {Promise<SuperviseHandle>} Resolves once the decision to spawn or reuse has been made.
 */
export async function superviseServer(options) {
   const {
      command,
      args,
      cwd,
      port,
      host = '127.0.0.1',
      watchPid,
      pollMs = 1000,
      log = (message) => console.error(message),
   } = options;

   /** @type {(code: number) => void} Settles `done`; assigned inside the promise constructor. */
   let finish = () => {};

   /** @type {Promise<number>} Resolves with the exit code to report. */
   const done = new Promise((resolve) => {
      /** @type {boolean} Guards against settling twice (child exit racing a stop). */
      let settled = false;
      finish = (code) => {
         if (!settled) {
            settled = true;
            resolve(code);
         }
      };
   });

   if (await isPortInUse(host, port)) {
      log(`[e2e-server] reusing the server already listening on ${host}:${port}`);
      return {
         child: null,
         stop: () => finish(0),
         done,
      };
   }

   log(`[e2e-server] starting: ${command} ${args.join(' ')} (cwd ${cwd})`);

   /** @type {import('node:child_process').ChildProcess} The server, spawned without a shell so its pid is the server's. */
   const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      windowsHide: true,
   });

   /** @type {NodeJS.Timeout | undefined} The liveness poll for the watched process. */
   let watchdog;

   /**
    * Kills the server tree and settles `done` with the given code.
    * @param {number} code - The exit code to report.
    * @returns {void}
    */
   const stopWith = (code) => {
      if (watchdog) {
         clearInterval(watchdog);
         watchdog = undefined;
      }
      killTree(child);
      finish(code);
   };

   child.once('exit', (code, signal) => {
      if (watchdog) {
         clearInterval(watchdog);
         watchdog = undefined;
      }
      log(`[e2e-server] server exited (${signal ?? `code ${code}`})`);
      finish(code ?? 0);
   });

   child.once('error', (error) => {
      log(`[e2e-server] failed to start the server: ${error.message}`);
      finish(1);
   });

   if (watchPid) {
      watchdog = setInterval(() => {
         if (!isAlive(watchPid)) {
            log(`[e2e-server] watched process ${watchPid} is gone; stopping the server`);
            stopWith(0);
         }
      }, pollMs);
   }

   return {
      child,
      stop: () => stopWith(0),
      done,
   };
}
