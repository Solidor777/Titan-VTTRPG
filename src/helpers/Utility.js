import { v4 as uuidv4 } from 'uuid';

export function clamp(value, min, max) {
   return Math.min(Math.max(value, min), max);
}

export function localize(string) {
   return game.i18n.localize(`LOCAL.${string}.label`);
}

export function format(string, data) {
   return game.i18n.format(`LOCAL.${string}.label`, data);
}

export function camelize(string) {
   return string.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
      if (+match === 0) {
         return '';
      } // or if (/\s+/.test(match)) for white spaces
      return index === 0 ? match.toLowerCase() : match.toUpperCase();
   });
}

export function shouldGetCheckOptions() {
   const retVal = game.settings.get('titan', 'getCheckOptions') === true;
   return game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT) ? !retVal : retVal;
}

export function confirmDeletingItems() {
   return game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT) ? false : game.settings.get('titan', 'confirmDeletingItems');
}

export function getSetting(setting) {
   return game.settings.get('titan', setting);
}

export function isFirstOwner(document) {
   // Check if the current user is the first owner
   // This is to ensure that certain functions only fire once
   const owners = game.users.filter((user) => user.active && document.testUserPermission(user, 'OWNER'));
   return owners.length > 0 && game.user === owners[0];
}

export function isHTMLBlank(html) {
   return (!html || html === '' || html === '<p></p>');
}

export function getCombatTargets() {
   // Get the targets
   let userTargets = Array.from(game.user.targets);

   // If not targets, get controlled tokens
   if (userTargets.length < 1 && game.user.isGM) {
      userTargets = Array.from(canvas.tokens.controlled);
   }

   return userTargets.map((target) => target.actor);
}

export function getControlledTokens() {
   return Array.from(canvas.tokens.controlled);
}

export function isGM() {
   return game.user.isGM;
}

export function applyDamageToTargets(damage, ignoreArmor, report = true, updateActor = true) {
   // Get targets
   const targets = getCombatTargets();

   // Apply healing to each target
   targets.forEach((target) => {
      if (target && target.system.resource?.stamina) {
         target.typeComponent.applyDamage(damage, ignoreArmor, report, updateActor);
      }
   });
}

export function applyHealingToTargets(healing = 1, report = true, updateActor = true) {
   // Get targets
   const targets = getCombatTargets();

   // Apply healing to each target
   targets.forEach((target) => {
      if (target && target.system.resource?.stamina) {
         target.typeComponent.applyHealing(healing, report, updateActor);
      }
   });
}

export function getActor(actorId, tokenId) {
   const token = canvas?.tokens?.placeables?.find((currentToken) => currentToken.id === tokenId);
   return token ? token.actor : game.actors.get(actorId);
}

export function documentSort(a, b) {
   if (a.sort < b.sort) {
      return -1;
   }
   if (a.sort > b.sort) {
      return 1;
   }
   return 0;
}

export function getSVGClass(source) {
   return source.indexOf('.svg') === -1 ? '' : 'svg';
}

export function getDarkSVGClass(source) {
   return source.indexOf('.svg') === -1 ? '' : 'dark-svg';
}

export function sortObjectsIntoContainerByKey(objects, key) {
   const retVal = {};
   for (const object of objects) {
      const sortedKey = object[key];
      if (!retVal[sortedKey]) {
         retVal[sortedKey] = [];
      }
      retVal[sortedKey].push(object);
   }

   return retVal;
}

export function sortObjectsIntoContainerByFunction(objects, sortFunction) {
   const retVal = {};
   for (const object of objects) {
      const sortedKey = sortFunction(object);
      if (!retVal[sortedKey]) {
         retVal[sortedKey] = [];
      }
      retVal[sortedKey].push(object);
   }

   return retVal;
}

export function getSumOfValuesInObject(object) {
   let retVal = 0;
   for (const value of Object.values(object)) {
      retVal += value;
   }

   return retVal;
}

export function getOwners(document) {
   return game.users.filter((user) =>
      document.testUserPermission(user, 'OWNER')
   );
}

export function getGMs() {
   return game.users.filter((user) =>
      user.isGM
   );
}


export function getPlayerOwners(document) {
   return game.users.filter((user) => document.testUserPermission(user, 'OWNER') && !user.isGM);
}

export function getBestPlayerOwner(document) {
   // Get Players
   const playerOwners = getPlayerOwners(document);
   if (playerOwners.length > 0) {

      // If there are multiple players
      if (playerOwners.length > 1) {

         // Get active players
         const activeOwners = playerOwners.filter((owner) => owner.active);
         if (activeOwners.length > 0) {

            // If there are multiple active players
            if (activeOwners.length > 1) {
               // Check if one is the active user
               const userPlayerOwner = activeOwners.filter(owner.id === game.user.id);
               if (userPlayerOwner) {
                  // return active user
                  return userPlayerOwner;
               }
            }

            // Return first active player
            return activeOwners[0];
         }
      }
      // Return first player
      return playerOwners[0];
   }

   // Found no player owners
   return false;
}

export function isModifierActive() {
   return game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT);
}

export async function regenerateUUID(document) {
   if (document) {
      await document.update({
         flags: {
            titan: {
               uuid: uuidv4()
            }
         }
      });

      ui.notifications.info(
         localize('regeneratedUUIDForDocument%x').replace('%x', document.name)
      );
   }
}

export function isCheck(chatMessageType) {
   switch (chatMessageType) {
      case 'attackCheck':
      case 'attributeCheck':
      case 'resistanceCheck':
      case 'castingCheck':
      case 'itemCheck': {
         return true;
      }
      default: {
         return false;
      }
   }
}