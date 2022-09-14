export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function localize(string) {
  return game.i18n.localize(string);
}