export function clamp(value, min, max) {
   return Math.min(Math.max(value, min), max);
}

export function localize(string) {
   return game.i18n.localize(`LOCAL.${string}.label`);
}

export function getCheckOptions() {
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
   return (!html || html === '' || html === '<p></p>')
}

export function getCombatTargets() {
   // Get the targets
   let userTargets = Array.from(game.user.targets);

   // If not targets, get controlled tokens
   if (userTargets.length < 1) {
      userTargets = Array.from(canvas.tokens.controlled);
   }

   return userTargets.map((target) => target.actor);
}

export function isGM() {
   return game.user.isGM;
}

export function applyDamageToTargets(damage, ignoreArmor, report = true) {
   // Get targets
   const targets = getCombatTargets();

   // Apply healing to each target
   targets.forEach((target) => {
      if (target && target.system.resource?.stamina) {
         target.typeComponent.applyDamage(damage, ignoreArmor, true);
      }
   });
}

export function applyHealingToTargets(healing, report = true) {
   // Get targets
   const targets = getCombatTargets();

   // Apply healing to each target
   targets.forEach((target) => {
      if (target && target.system.resource?.stamina) {
         target.typeComponent.healDamage(healing, report);
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