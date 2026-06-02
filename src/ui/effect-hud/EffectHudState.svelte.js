/**
 * Reactive UI state for the Effect HUD. Owned by the controller so it survives the
 * unmount/remount cycle that happens when the tracked actor changes.
 * @class EffectHudState
 */
export default class EffectHudState {
   /** @type {boolean} Whether the panel is collapsed to an icon grid. */
   collapsed = $state(false);
}
