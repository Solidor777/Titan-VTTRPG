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
  const owners = game.users.filter((user) => user.active && document.canUserModify(user, 'owner'));
  return owners.length > 0 && game.user === owners[0];
}

export function isHtmlBlank(html) {
  return (html === '' || html === '<p></p>')
}