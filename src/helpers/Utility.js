export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function localize(string) {
  return game.i18n.localize(`LOCAL.${string}.label`);
}

export function getOptions() {
  const retVal = game.settings.get('titan', 'getCheckOptions') === true;
  return game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT) ? !retVal : retVal;
}