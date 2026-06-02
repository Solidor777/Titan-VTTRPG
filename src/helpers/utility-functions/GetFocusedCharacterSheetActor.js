/**
 * Gets the Character Actor whose sheet is currently focused/active, if any. Used as the final
 * fallback target when no tokens are targeted or controlled. The active application window is read
 * from `ui.activeWindow`, the public v14 accessor that both ApplicationV1 and ApplicationV2 keep in
 * sync (the ApplicationV2 `#frontApp` equivalent is private and has no public getter). A
 * DocumentSheetV2 exposes its backing document on `.document`.
 * @returns {TitanActor | null} The focused sheet's Character Actor, or null if none applies.
 */
export default function getFocusedCharacterSheetActor() {
   // The most recently focused application window (Foundry tracks this on ui.activeWindow).
   const active = ui.activeWindow;

   // The backing document of the active window, when that window is an Actor sheet. The
   // `documentName === 'Actor'` guard filters out focused non-actor windows (compendium browsers,
   // chat, the effect tray itself) that may expose a `.document` of a different type.
   const actor = active?.document?.documentName === 'Actor' ? active.document : void 0;

   return actor?.system?.isCharacter ? actor : null;
}
