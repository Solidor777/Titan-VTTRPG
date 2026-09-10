import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractPack } from '@foundryvtt/foundryvtt-cli';

/** @type {string} The repository root, resolved from this script's location. */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string} The directory holding one source folder of JSON documents per compendium pack. */
const sourceRoot = path.join(repoRoot, 'packs', '_source');

/**
 * Extracts every compiled `packs/<name>` LevelDB pack back into `packs/_source/<name>` as one JSON file per
 * document, mirroring compendium folders as directories. Run after editing pack content inside Foundry
 * (with the world returned to setup) so the tracked source reflects the edits.
 * @returns {Promise<void>} Resolves once every pack is extracted.
 */
async function extractPacks() {
   /** @type {string[]} The pack names, one per source directory. */
   const packs = readdirSync(sourceRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

   for (const name of packs) {
      await extractPack(path.join(repoRoot, 'packs', name), path.join(sourceRoot, name), {
         folders: true,
         clean: true,
         log: true,
      });
      console.log(`Extracted packs/${name} → packs/_source/${name}`);
   }
}

await extractPacks();
