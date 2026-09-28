<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import applyEffectToTargets from '~/helpers/utility-functions/ApplyEffectToTargets.js';
   import focusOnMount from '~/helpers/svelte-actions/FocusOnMount.js';
   import { TARGET_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} EffectTrayRowProps
    * @property {object} effect - The ActiveEffect document for this row.
    */

   /** @type {EffectTrayRowProps} */
   const { effect } = $props();

   /**
    * @type {import('~/sidebar/tray/EffectTrayState.svelte.js').default} The reactive tray state from
    *    context.
    */
   const trayState = getContext('trayState');

   /** @type {string} The localized label for the Apply to Target button. */
   const applyLabel = localize('effectTrayApply');

   /** @type {boolean} Whether the name is currently being edited inline. */
   let isRenaming = $state(false);

   /** @type {string} The working value of the inline rename input. */
   let renameValue = $state('');

   /** @type {boolean} Whether the current rename is being cancelled, so the blur commit is skipped. */
   let isCancellingRename = false;

   /**
    * Opens the effect's sheet, as clicking a core directory entry does. No-ops while renaming.
    * @returns {void}
    */
   function openSheet() {
      if (!isRenaming) {
         effect.sheet.render(true);
      }
   }

   /**
    * Svelte action: begins inline rename when the row receives the `titan-effect-rename` event the
    * context menu dispatches.
    * @param {HTMLElement} node - The row root element.
    * @returns {{ destroy: () => void }} The action lifecycle handle.
    */
   function renameOnEvent(node) {
      /**
       * Starts the inline rename in response to the context menu's rename event.
       * @returns {void}
       */
      const handler = () => beginRename();
      node.addEventListener('titan-effect-rename', handler);
      return {
         destroy() {
            node.removeEventListener('titan-effect-rename', handler);
         },
      };
   }

   /**
    * Enters inline-rename mode, seeding the input with the effect's current name. No-ops when the
    * current user cannot edit the selected pack.
    * @returns {void}
    */
   function beginRename() {
      if (!trayState.canEdit) {
         return;
      }

      renameValue = effect.name;
      isRenaming = true;
   }

   /**
    * Commits the inline rename, persisting the new name through the tray state, then reverts to the
    * static name display. When the rename was cancelled via Escape, clears the cancelling flag and
    * returns early without persisting.
    * @returns {Promise<void>}
    */
   async function commitRename() {
      if (isCancellingRename) {
         isCancellingRename = false;
         return;
      }

      isRenaming = false;
      await trayState.renameEffect(effect, renameValue.trim());
   }

   /**
    * Handles keydown within the rename input: Enter commits, Escape cancels.
    * @param {KeyboardEvent} event - The keydown event.
    * @returns {void}
    */
   function onRenameKeydown(event) {
      if (event.key === 'Enter') {
         event.preventDefault();
         void commitRename();
      }
      else if (event.key === 'Escape') {
         event.preventDefault();
         isCancellingRename = true;
         isRenaming = false;
      }
   }

   /**
    * Handles keydown on the name: Enter opens the sheet, F2 begins inline rename.
    * @param {KeyboardEvent} event - The keydown event.
    * @returns {void}
    */
   function onNameKeydown(event) {
      if (event.key === 'Enter') {
         event.preventDefault();
         openSheet();
      }
      else if (event.key === 'F2') {
         event.preventDefault();
         beginRename();
      }
   }

   /**
    * Writes the effect's standard Foundry drag data onto the drag event so dropping the row onto an
    * actor sheet or token applies the effect natively, dropping it in the tray moves or sorts it within the
    * pack, and dropping it on another tray pack stashes it there. Closes any open context menu and stops
    * the event, as core's directory does, so the enclosing folder item does not overwrite the data.
    * @param {DragEvent} event - The dragstart event.
    * @returns {void}
    */
   function onDragStart(event) {
      ui.context?.close({ animate: false });
      event.dataTransfer.setData('text/plain', JSON.stringify(effect.toDragData()));
      event.stopPropagation();
   }
</script>

<!--
   Core directory entry markup (`templates/sidebar/partials/document-partial.hbs`) so the core sidebar styles
   apply. The whole row opens the sheet on click like a core entry; the name carries keyboard access.
-->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<li
   class="directory-item entry document flexrow"
   data-effect-id={effect.id}
   data-entry-id={effect.id}
   data-testid="effect-tray-row"
   draggable={true}
   onclick={openSheet}
   ondragstart={onDragStart}
   use:renameOnEvent
>
   <img
      class="thumbnail"
      alt={effect.name}
      loading="lazy"
      src={effect.img}
   />

   {#if isRenaming}
      <input
         class="entry-name"
         data-testid="effect-tray-rename"
         type="text"
         use:focusOnMount
         onblur={() => void commitRename()}
         onclick={(event) => event.stopPropagation()}
         onkeydown={onRenameKeydown}
         bind:value={renameValue}
      />
   {:else}
      <span
         class="entry-name ellipsis"
         onkeydown={onNameKeydown}
         role="button"
         tabindex="0"
      >
         {effect.name}
      </span>
   {/if}

   <!--Apply to Target (stops propagation so applying does not also open the sheet)-->
   <button
      class="inline-control icon {TARGET_ICON}"
      aria-label={applyLabel}
      data-testid="effect-tray-apply"
      data-tooltip=""
      onclick={(event) => {
         event.stopPropagation();
         applyEffectToTargets(effect);
      }}
      type="button"
   ></button>
</li>

<style lang="scss">
   .entry {
      align-items: center;

      .entry-name {
         flex: 1;
      }

      .inline-control {
         flex: none;
         margin-right: 4px;
      }
   }
</style>
