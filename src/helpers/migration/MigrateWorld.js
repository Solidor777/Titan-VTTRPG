import log from '~/helpers/utility-functions/Log.js';
import error from '~/helpers/utility-functions/Error.js';
import localize from '~/helpers/utility-functions/Localize.js';
import actorMigrations from '~/helpers/migration/actor/ActorMigrations.js';
import characterMigrations from '~/helpers/migration/actor/CharacterMigrations.js';
import playerMigrations from '~/helpers/migration/actor/PlayerMigrations.js';
import npcMigrations from '~/helpers/migration/actor/NpcMigrations.js';
import itemMigrations from '~/helpers/migration/item/ItemMigrations.js';
import abilityMigrations from '~/helpers/migration/item/AbilityMigrations.js';
import armorMigrations from '~/helpers/migration/item/ArmorMigrations.js';
import commodityMigrations from '~/helpers/migration/item/CommodityMigrations.js';
import equipmentMigrations from '~/helpers/migration/item/EquipmentMigrations.js';
import shieldMigrations from '~/helpers/migration/item/ShieldMigrations.js';
import spellMigrations from '~/helpers/migration/item/SpellMigrations.js';
import weaponMigrations from '~/helpers/migration/item/WeaponMigrations.js';
import { migrateStoredActors, storedActorsNeedMigration } from '~/helpers/migration/MigrateStoredActors.js';

/**
 * A migration entry describing how to upgrade a document's schema to a specific system version.
 * @typedef {object} TitanMigration
 * @property {number} version - The system version (as a decimal, e.g. 1.1) this migration upgrades the document to.
 * @property {function(foundry.abstract.Document, object): object} migrate - Applies changes to the accumulated update
 * data and returns the updated data object.
 */

/**
 * Ordered migration chains keyed by Actor type. Each chain lists migration arrays from most base to most specific.
 * For a given version, migrations are run from each level in order before advancing to the next version.
 * Version numbers must be unique and ascending within each level, and consistent across the chain.
 * @type {{[key: string]: Array<TitanMigration[]>}}
 */
const ACTOR_MIGRATION_CHAINS = {
   player: [
      actorMigrations,
      characterMigrations,
      playerMigrations,
   ],
   npc: [
      actorMigrations,
      characterMigrations,
      npcMigrations,
   ],
};

/**
 * Ordered migration chains keyed by Item type. Each chain lists migration arrays from most base to most specific.
 * For a given version, migrations are run from each level in order before advancing to the next version.
 * Version numbers must be unique and ascending within each level, and consistent across the chain.
 * @type {{[key: string]: Array<TitanMigration[]>}}
 */
const ITEM_MIGRATION_CHAINS = {
   ability: [
      itemMigrations,
      abilityMigrations,
   ],
   armor: [
      itemMigrations,
      armorMigrations,
   ],
   commodity: [
      itemMigrations,
      commodityMigrations,
   ],
   equipment: [
      itemMigrations,
      equipmentMigrations,
   ],
   shield: [
      itemMigrations,
      shieldMigrations,
   ],
   spell: [
      itemMigrations,
      spellMigrations,
   ],
   weapon: [
      itemMigrations,
      weaponMigrations,
   ],
};

/**
 * Returns the highest version number defined across all levels of a migration chain.
 * @param {Array<TitanMigration[]>} chain - The migration chain to inspect.
 * @returns {number} The latest version in the chain, or 0 if the chain has no entries.
 */
function getChainLatestVersion(chain) {
   /** @type {number} - The highest version number found so far across all chain levels. */
   let latest = 0;
   for (const level of chain) {
      for (const entry of level) {
         if (entry.version > latest) {
            latest = entry.version;
         }
      }
   }
   return latest;
}

/**
 * Checks whether a document's schema version is behind the latest version defined in its migration chain.
 * @param {foundry.abstract.Document} document - The document to check.
 * @param {Array<TitanMigration[]> | undefined} chain - The migration chain for this document type.
 * @returns {boolean} Whether the document needs migration.
 */
function documentNeedsMigration(document, chain) {
   if (!chain) {
      return false;
   }
   /** @type {number} - The highest version defined in the migration chain. */
   const latestVersion = getChainLatestVersion(chain);
   if (latestVersion === 0) {
      return false;
   }
   return document.system.documentVersion < latestVersion;
}

/**
 * Checks whether any Actor or Item in the world, including items embedded within actors, is behind its version chain.
 * @returns {boolean} Whether any document needs a version-chain migration.
 */
function versionChainsNeedMigration() {
   for (const actor of game.actors) {
      if (documentNeedsMigration(actor, ACTOR_MIGRATION_CHAINS[actor.type])) {
         return true;
      }
      for (const item of actor.items) {
         if (documentNeedsMigration(item, ITEM_MIGRATION_CHAINS[item.type])) {
            return true;
         }
      }
   }

   for (const item of game.items) {
      if (documentNeedsMigration(item, ITEM_MIGRATION_CHAINS[item.type])) {
         return true;
      }
   }
   return false;
}

/**
 * Checks whether the world needs migration: any Actor or Item (items embedded in actors included) behind its version
 * chain, or any stored actor needing the stored-actor migration (a legacy effect Item to convert, or a condition
 * effect whose rules elements differ from its definition or which still stores a description) in any location
 * walkStoredActorSources reads.
 * @returns {Promise<boolean>} Whether anything in the world needs migration.
 */
export async function worldNeedsMigration() {
   if (versionChainsNeedMigration()) {
      return true;
   }
   return storedActorsNeedMigration();
}

/**
 * Migrates a single document through all pending versions in its migration chain. For each pending version, runs
 * migrations from each chain level in order (base to specific) before advancing to the next version. Stops at the
 * last fully completed version if any migration throws an error.
 * @param {foundry.abstract.Document} document - The document to migrate.
 * @param {Array<TitanMigration[]> | undefined} chain - The ordered migration chain for this document type.
 * @returns {Promise<boolean>} Whether every pending version migrated (true when none was pending).
 */
async function migrateDocument(document, chain) {
   if (!chain) {
      return true;
   }

   /** @type {number} - The document's current schema version. */
   const currentVersion = document.system.documentVersion;

   /** @type {number} - The highest version defined in the migration chain. */
   const latestVersion = getChainLatestVersion(chain);
   if (latestVersion === 0 || currentVersion >= latestVersion) {
      return true;
   }

   /** @type {number[]} - All unique versions in the chain newer than currentVersion, sorted ascending. */
   const pendingVersions = [
      ...new Set(chain.flat().map((m) => m.version).filter((v) => v > currentVersion)),
   ].sort((a, b) => a - b);

   /** @type {object} - Accumulated document update data built up across all pending migrations. */
   let updateData = {};

   /** @type {number} - The version the document has been successfully migrated to so far. */
   let migratedVersion = currentVersion;

   /** @type {boolean} - Whether a migration for some pending version failed. */
   let versionFailed = false;

   for (const version of pendingVersions) {
      for (const level of chain) {
         for (const migration of level.filter((m) => m.version === version)) {
            try {
               updateData = migration.migrate(document, updateData);
            }
            catch (err) {
               /** @type {string} - Error message identifying the document and version that failed. */
               const msg = `Failed to migrate ${document.documentName} "${document.name}" ` +
                  `(${document.id}) to version ${version}.`;
               error(msg, err);
               versionFailed = true;
               break;
            }
         }
         if (versionFailed) {
            break;
         }
      }

      if (versionFailed) {
         break;
      }
      migratedVersion = version;
   }

   if (migratedVersion > currentVersion) {
      await document.update({
         'system.documentVersion': migratedVersion,
         ...updateData,
      });
   }
   return !versionFailed;
}

/**
 * Migrates a single document through its version chain, isolating a failed write so the rest of the world still
 * migrates. A failed migration step is reported by migrateDocument; a failed write is reported here.
 * @param {foundry.abstract.Document} document - The document to migrate.
 * @param {Array<TitanMigration[]> | undefined} chain - The ordered migration chain for this document type.
 * @returns {Promise<boolean>} Whether the document migrated fully.
 */
async function migrateDocumentIsolated(document, chain) {
   try {
      return await migrateDocument(document, chain);
   }
   catch (err) {
      error(`Failed to write the migration of ${document.documentName} "${document.name}" (${document.id}).`, err);
      return false;
   }
}

/**
 * Migrates every world Actor, the Items embedded in each, and every world Item through their version chains.
 * @returns {Promise<number>} The number of documents that did not migrate fully.
 */
async function migrateVersionChains() {
   /** @type {number} The documents that did not migrate fully. */
   let failed = 0;
   for (const actor of game.actors) {
      if (!(await migrateDocumentIsolated(actor, ACTOR_MIGRATION_CHAINS[actor.type]))) {
         failed += 1;
      }
      for (const item of actor.items) {
         if (!(await migrateDocumentIsolated(item, ITEM_MIGRATION_CHAINS[item.type]))) {
            failed += 1;
         }
      }
   }

   for (const item of game.items) {
      if (!(await migrateDocumentIsolated(item, ITEM_MIGRATION_CHAINS[item.type]))) {
         failed += 1;
      }
   }
   return failed;
}

/**
 * Migrates the world. Runs only on the active GM's client (one GM migrates, however many are connected) and only when
 * worldNeedsMigration reports work; it scans again itself because the Prompt dialog calls it after the world may have
 * changed. The stored-actor migration runs first, so legacy effect Items are Active Effects before anything reads
 * items: it walks every stored actor (world actors, unlinked tokens, and the actors and tokens in world Actor, Scene,
 * and Adventure packs), converts legacy effect Items into Active Effects, then syncs each stale condition effect to
 * its definition (rules elements rewritten, a stored description deleted). Then every
 * world Actor, its Items, and every world Item migrate through their version chains. Each actor and document is
 * isolated, and the final notification reports how many failed instead of announcing completion over failures.
 * @returns {Promise<void>}
 */
export async function migrateWorld() {
   if (!game.users.activeGM?.isSelf) {
      return;
   }

   if (!(await worldNeedsMigration())) {
      return;
   }

   log('Starting world migration.');
   ui.notifications.info(localize('migrationStarted'));

   /** @type {StoredActorMigrationCounts} The stored-actor pass's outcome. */
   const counts = await migrateStoredActors();

   /** @type {number} The stored actors and documents that did not migrate. */
   const failed = counts.failed + (await migrateVersionChains());
   if (failed > 0) {
      log(`World migration finished; ${failed} documents failed to migrate.`);
      ui.notifications.warn(localize('migrationFailedX%').replace('X%', failed));
      return;
   }

   log('World migration complete.');
   ui.notifications.info(localize('migrationComplete'));
}

/**
 * Resolves what a GM world load does about migration. Source: the `migrationMode` setting's hint ("Prompt: displays a
 * confirmation dialog before migrating. Automatic: migrates immediately without prompting. Disabled: skips migration
 * entirely."). Disabled resolves before the world is scanned, so a Disabled load reads no document.
 * @param {string} mode - The `migrationMode` setting ('prompt', 'automatic', or 'disabled').
 * @param {() => Promise<boolean>} needsMigration - Scans the world for a pending migration (worldNeedsMigration);
 * awaited only when the mode can act on its answer.
 * @returns {Promise<'none'|'migrate'|'prompt'>} Nothing, migrate now, or ask the GM first.
 */
export async function resolveMigrationAction(mode, needsMigration) {
   if (mode === 'disabled' || !(await needsMigration())) {
      return 'none';
   }
   if (mode === 'automatic') {
      return 'migrate';
   }
   return 'prompt';
}
