import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The running list of everything the e2e suite makes in the `test-titan` world: documents, hotbar assignments and
// prior setting values. Flows append to it as they create; `global-teardown.js` deletes everything on it when the run
// ends, and `global-setup.js` does the same over a list a crashed run left behind. The list is a file, not module
// state, because it must outlive a spec file, a mid-file reload and the worker process, and be read by the runner.
// A leaf module: it imports no flow and no test runner code, so the setup and the teardown load it freely. The shared
// fixtures that read it (`flows.js` `shared`) are created lazily by the first spec that asks and reused by every
// later one.

/** @type {string} The directory of this module, used to resolve the repo root. */
const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {string} The directory holding the running list; not `test/build/`, which the probe build empties. */
export const STATE_DIR = path.resolve(dirname, '../../test/state');

/** @type {string} The running list's file. */
export const REGISTRY_PATH = path.join(STATE_DIR, 'registry.json');

/**
 * @typedef {object} RegistryDocument
 * @property {string} [key] - The shared fixture name, when the document is a shared fixture.
 * @property {string} documentName - The document class name, or `Compendium` for a world compendium pack.
 * @property {string} id - The document id; for a `Compendium`, the pack collection id (`world.<name>`).
 * @property {string|null} parent - The uuid of the embedding document, or null for a world or pack document.
 * @property {string} [sceneId] - The scene of a `Token`.
 * @property {string} [packId] - The pack collection id of a document that lives in a pack.
 * @property {string} createdBy - The spec file that made it.
 */

/**
 * @typedef {object} RegistryHotbarEntry
 * @property {string} userId - The user whose hotbar was assigned.
 * @property {number} slot - The hotbar slot.
 * @property {string} macroId - The macro assigned to the slot.
 */

/**
 * @typedef {object} RegistrySetting
 * @property {'world'} scope - The setting scope; only world settings are recorded.
 * @property {string} namespace - The setting namespace.
 * @property {string} key - The setting key.
 * @property {*} prior - The value the setting held before the suite first set it.
 */

/**
 * @typedef {object} Registry
 * @property {number|null} runStartedAt - When the run started (ms since the epoch), or null when no run is in flight.
 * @property {RegistryDocument[]} documents - Every document the suite made, in creation order.
 * @property {RegistryHotbarEntry[]} hotbar - Every hotbar assignment the suite made.
 * @property {RegistrySetting[]} settings - Each setting the suite changed, with its first prior value.
 */

/**
 * Builds a list with nothing on it and no run in flight.
 * @returns {Registry} The empty list.
 */
export function emptyRegistry() {
   return {
      runStartedAt: null,
      documents: [],
      hotbar: [],
      settings: [],
   };
}

/**
 * Reads the running list.
 * @returns {Registry} The list in the file, or an empty list when there is no file.
 */
export function readRegistry() {
   if (!fs.existsSync(REGISTRY_PATH)) {
      return emptyRegistry();
   }
   return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

/**
 * Writes the running list.
 * @param {Registry} registry - The list to store.
 * @returns {void}
 */
export function writeRegistry(registry) {
   fs.mkdirSync(STATE_DIR, { recursive: true });
   fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 3));
}

/**
 * Starts a run: the list is emptied and stamped with the start time. Chat messages from this time on are the run's.
 * @returns {Registry} The new list.
 */
export function startRun() {
   /** @type {Registry} The list of the run that is starting. */
   const registry = {
      ...emptyRegistry(),
      runStartedAt: Date.now(),
   };
   writeRegistry(registry);
   return registry;
}

/**
 * Ends a run: the list is emptied and no run is in flight. The file is overwritten, never deleted.
 * @returns {void}
 */
export function resetRegistry() {
   writeRegistry(emptyRegistry());
}

/**
 * Whether a list holds anything a teardown must act on: a run in flight or any entry.
 * @param {Registry} registry - The list to inspect.
 * @returns {boolean} True when there is something to tear down.
 */
export function hasWork(registry) {
   return registry.runStartedAt !== null
      || registry.documents.length > 0
      || registry.hotbar.length > 0
      || registry.settings.length > 0;
}

/**
 * Appends a document the suite made to the running list.
 * @param {Omit<RegistryDocument, 'parent'|'createdBy'> & {parent?: string|null, createdBy: string}} entry - The
 * document; `parent` defaults to null.
 * @returns {RegistryDocument} The entry as stored.
 */
export function record(entry) {
   /** @type {Registry} The list to append to. */
   const registry = readRegistry();

   /** @type {RegistryDocument} The entry as stored. */
   const stored = {
      parent: null,
      ...entry,
   };
   registry.documents.push(stored);
   writeRegistry(registry);
   return stored;
}

/**
 * Appends a hotbar assignment to the running list.
 * @param {RegistryHotbarEntry} entry - The assignment.
 * @returns {void}
 */
export function recordHotbar(entry) {
   /** @type {Registry} The list to append to. */
   const registry = readRegistry();
   registry.hotbar.push(entry);
   writeRegistry(registry);
}

/**
 * Appends a setting's prior value to the running list. A setting already on the list keeps its first prior value, so
 * the teardown restores the value from before the suite touched it.
 * @param {RegistrySetting} entry - The setting and the value it held before this change.
 * @returns {void}
 */
export function recordSetting(entry) {
   /** @type {Registry} The list to append to. */
   const registry = readRegistry();
   if (registry.settings.some((setting) => setting.scope === entry.scope
      && setting.namespace === entry.namespace
      && setting.key === entry.key)) {
      return;
   }
   registry.settings.push(entry);
   writeRegistry(registry);
}
