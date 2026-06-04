import localize from '~/helpers/utility-functions/Localize.js';
import applyEffectToTargets from '~/helpers/utility-functions/ApplyEffectToTargets.js';
import {
   DELETE_ICON,
   DUPLICATE_ICON,
   MOVE_TO_FOLDER_ICON,
   RENAME_ICON,
   SHEET_ICON,
   TARGET_ICON,
} from '~/system/Icons.js';

/**
 * Resolves the live ActiveEffect for a context-menu target row from its `data-effect-id`.
 * @param {HTMLElement} target - The row element the menu was opened on (carries `data-effect-id`).
 * @param {import('~/sidebar/tray/EffectTrayState.svelte.js').default} trayState - Reactive tray
 * state providing the loaded effect documents.
 * @returns {object | undefined} The matching loaded effect, or undefined when not found.
 */
function resolveEffect(target, trayState) {
   /** @type {string | undefined} The effect id read off the row element. */
   const id = target?.closest('[data-effect-id]')?.dataset?.effectId;
   return id ? trayState.effects.find((effect) => effect.id === id) : void 0;
}

/**
 * Builds the right-click context-menu entries for an effect-tray row. Apply and Open Sheet are always
 * available; Rename, Move to Folder, Duplicate, and Delete require edit permission (Move also requires
 * a folder-capable pack). Entry shape matches TITAN's v14 directory hooks
 * (`{ label, icon, visible(target), onClick(event, target) }`).
 * @param {import('~/sidebar/tray/EffectTrayState.svelte.js').default} trayState - Reactive tray state
 * read by the entries for permission gating and effect resolution.
 * @param {(effect: object) => void} openMoveToFolder - Opens the move-to-folder picker for an effect.
 * Injected by the tray so this module carries no AppV2-dialog import and stays unit-testable.
 * @returns {object[]} The ContextMenuEntry array.
 */
export default function buildEffectRowContextMenu(trayState, openMoveToFolder) {
   return [
      {
         label: localize('effectTrayApply'),
         icon: `<i class="${TARGET_ICON}"></i>`,
         visible: () => true,
         onClick: (event, target) => {
            /** @type {object | undefined} The effect for the clicked row. */
            const effect = resolveEffect(target, trayState);
            if (effect) {
               void applyEffectToTargets(effect);
            }
         },
      },
      {
         label: localize('effectTrayOpen'),
         icon: `<i class="${SHEET_ICON}"></i>`,
         visible: () => true,
         onClick: (event, target) => {
            resolveEffect(target, trayState)?.sheet?.render(true);
         },
      },
      {
         label: localize('effectTrayRename'),
         icon: `<i class="${RENAME_ICON}"></i>`,
         visible: () => trayState.canEdit,
         onClick: (event, target) => {
            // Bridge to the row's inline-rename UX via a custom event it listens for.
            target?.closest('[data-effect-id]')
               ?.dispatchEvent(new CustomEvent('titan-effect-rename', { bubbles: false }));
         },
      },
      {
         label: localize('effectTrayMoveToFolder'),
         icon: `<i class="${MOVE_TO_FOLDER_ICON}"></i>`,
         visible: () => trayState.canEdit && !!trayState.selectedPack?.folders,
         onClick: (event, target) => {
            /** @type {object | undefined} The effect for the clicked row. */
            const effect = resolveEffect(target, trayState);
            if (effect) {
               openMoveToFolder(effect);
            }
         },
      },
      {
         label: localize('effectTrayDuplicate'),
         icon: `<i class="${DUPLICATE_ICON}"></i>`,
         visible: () => trayState.canEdit,
         onClick: (event, target) => {
            /** @type {object | undefined} The effect for the clicked row. */
            const effect = resolveEffect(target, trayState);
            if (effect) {
               void trayState.duplicateEffect(effect);
            }
         },
      },
      {
         label: localize('effectTrayDelete'),
         icon: `<i class="${DELETE_ICON}"></i>`,
         visible: () => trayState.canEdit,
         onClick: (event, target) => {
            /** @type {object | undefined} The effect for the clicked row. */
            const effect = resolveEffect(target, trayState);
            if (effect) {
               trayState.requestDeleteEffect(effect);
            }
         },
      },
   ];
}
