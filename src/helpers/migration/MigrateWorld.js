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
 * Checks whether any Actor or Item in the world, including items embedded within actors, needs migration.
 * @returns {boolean} Whether any document in the world needs migration.
 */
export function worldNeedsMigration() {
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
 * Migrates a single document through all pending versions in its migration chain. For each pending version, runs
 * migrations from each chain level in order (base to specific) before advancing to the next version. Stops at the
 * last fully completed version if any migration throws an error.
 * @param {foundry.abstract.Document} document - The document to migrate.
 * @param {Array<TitanMigration[]> | undefined} chain - The ordered migration chain for this document type.
 * @returns {Promise<void>}
 */
async function migrateDocument(document, chain) {
   if (!chain) {
      return;
   }

   /** @type {number} - The document's current schema version. */
   const currentVersion = document.system.documentVersion;

   /** @type {number} - The highest version defined in the migration chain. */
   const latestVersion = getChainLatestVersion(chain);
   if (latestVersion === 0 || currentVersion >= latestVersion) {
      return;
   }

   /** @type {number[]} - All unique versions in the chain newer than currentVersion, sorted ascending. */
   const pendingVersions = [
      ...new Set(chain.flat().map((m) => m.version).filter((v) => v > currentVersion)),
   ].sort((a, b) => a - b);

   /** @type {object} - Accumulated document update data built up across all pending migrations. */
   let updateData = {};

   /** @type {number} - The version the document has been successfully migrated to so far. */
   let migratedVersion = currentVersion;

   for (const version of pendingVersions) {
      /** @type {boolean} - Whether any migration for the current version has failed. */
      let versionFailed = false;

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
}

/**
 * Migrates all Actor and Item documents in the world to the latest schema version, including items embedded within
 * actors. Only runs for the GM. Skips documents that are already up to date. This is purely the version-chain
 * migrator; the one-shot legacy-effect converter is run separately from the Ready hook.
 * @returns {Promise<void>}
 */
export async function migrateWorld() {
   if (!game.user.isGM) {
      return;
   }

   if (!worldNeedsMigration()) {
      return;
   }

   log('Starting world migration.');
   ui.notifications.info(localize('migrationStarted'));

   for (const actor of game.actors) {
      await migrateDocument(actor, ACTOR_MIGRATION_CHAINS[actor.type]);
      for (const item of actor.items) {
         await migrateDocument(item, ITEM_MIGRATION_CHAINS[item.type]);
      }
   }

   for (const item of game.items) {
      await migrateDocument(item, ITEM_MIGRATION_CHAINS[item.type]);
   }

   log('World migration complete.');
   ui.notifications.info(localize('migrationComplete'));
}
