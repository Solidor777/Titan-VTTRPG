import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ClassicLevel } from 'classic-level';
import { compilePack } from '@foundryvtt/foundryvtt-cli';

/** @type {string} The repository root, resolved from this script's location. */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string} The directory holding one source folder of JSON documents per compendium pack. */
const sourceRoot = path.join(repoRoot, 'packs', '_source');

/**
 * Empties a compiled LevelDB pack so documents removed from the source no longer linger in the build.
 * The CLI's compiler only puts keys, so a stale entry would otherwise survive every rebuild.
 * @param {string} packPath - The compiled pack directory.
 * @returns {Promise<void>} Resolves once the pack is empty (or was never created).
 */
async function clearPack(packPath) {
   if (!existsSync(packPath)) {
      return;
   }

   // Foundry holds an exclusive LevelDB lock on every declared pack while a world is running.
   const db = new ClassicLevel(packPath, { createIfMissing: false });
   try {
      await db.open();
      await db.clear();
   }
   catch (error) {
      throw new Error(
         `Cannot open ${packPath} — return the running world to setup (or stop Foundry) before building packs.`,
         { cause: error },
      );
   }
   finally {
      await db.close().catch(() => {});
   }
}

/**
 * Compiles every `packs/_source/<name>` directory into the LevelDB pack at `packs/<name>`.
 * @returns {Promise<void>} Resolves once every pack is compiled.
 */
async function buildPacks() {
   /** @type {string[]} The pack names, one per source directory. */
   const packs = readdirSync(sourceRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

   for (const name of packs) {
      const dest = path.join(repoRoot, 'packs', name);
      await clearPack(dest);
      await compilePack(path.join(sourceRoot, name), dest, {
         recursive: true,
         log: true 
      });
      console.log(`Compiled packs/_source/${name} → packs/${name}`);
   }
}

await buildPacks();
