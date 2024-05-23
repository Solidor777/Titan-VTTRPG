/**
 * Returns true if the Modifier Key is pressed.
 * By default, this is Shift.
 * @returns {boolean} Whether the modifier key is pressed.
 */
export default function isModifierActive() {
   return game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT);
}
