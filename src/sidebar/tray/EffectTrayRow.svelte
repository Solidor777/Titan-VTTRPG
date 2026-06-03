<script>
   import { getContext, onDestroy } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import applyEffectToTargets from '~/helpers/utility-functions/ApplyEffectToTargets.js';
   import focusOnMount from '~/helpers/svelte-actions/FocusOnMount.js';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
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

   /** @type {ReturnType<typeof setTimeout> | null} Pending single-click timer, cancelled by a dblclick. */
   let openTimer = null;

   /**
    * Opens the effect's sheet on a single left-click of the row. Debounced so a double-click (which
    * starts an inline rename) does not also open the sheet. No-ops while renaming.
    * @returns {void}
    */
   function onRowClick() {
      if (isRenaming) {
         return;
      }

      if (openTimer) {
         clearTimeout(openTimer);
      }

      openTimer = setTimeout(() => {
         openTimer = null;
         effect.sheet.render(true);
      }, 250);
   }

   // Cancel a pending open timer if the row unmounts mid-debounce (e.g. a hook-driven list refresh),
   // so the sheet never opens after the row is gone.
   onDestroy(() => {
      if (openTimer) {
         clearTimeout(openTimer);
         openTimer = null;
      }
   });

   /**
    * Svelte action: begins inline rename when the row receives the `titan-effect-rename` event the
    * context menu dispatches. Lets the right-click "Rename" entry drive the existing inline-rename UX.
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
      if (openTimer) {
         clearTimeout(openTimer);
         openTimer = null;
      }

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
    * Handles keydown on the static name: Enter or F2 begins inline rename, mirroring the
    * double-click affordance for keyboard users.
    * @param {KeyboardEvent} event - The keydown event.
    * @returns {void}
    */
   function onNameKeydown(event) {
      if (event.key === 'Enter' || event.key === 'F2') {
         event.preventDefault();
         beginRename();
      }
   }

   /**
    * Writes the effect's standard Foundry drag data onto the drag event so dropping the row onto an
    * actor sheet or token applies the effect natively, and dropping it on another tray pack stashes
    * it there.
    * @param {DragEvent} event - The dragstart event.
    * @returns {void}
    */
   function onDragStart(event) {
      event.dataTransfer.setData('text/plain', JSON.stringify(effect.toDragData()));
   }
</script>

<!--
   The row is click-to-open for pointer users; keyboard parity is provided by the focusable name
   (`role="button"`, Enter/F2 to rename) and the row's right-click context menu (Open Sheet, etc.).
-->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
   class="effect-tray-row"
   data-effect-id={effect.id}
   data-testid="effect-tray-row"
   draggable={true}
   onclick={onRowClick}
   ondragstart={onDragStart}
   role="listitem"
   use:renameOnEvent
>
   <img
      alt=""
      class="effect-tray-row-icon"
      src={effect.img}
   />

   <!--Name (double-click to rename when editable)-->
   {#if isRenaming}
      <input
         class="effect-tray-row-rename"
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
         class="effect-tray-row-name"
         role="button"
         tabindex={trayState.canEdit ? 0 : -1}
         ondblclick={beginRename}
         onkeydown={onNameKeydown}
      >
         {effect.name}
      </span>
   {/if}

   <div class="effect-tray-row-controls">
      <!--Apply to Target button (stops propagation so applying does not also open the sheet)-->
      <IconButton
         icon={TARGET_ICON}
         label={applyLabel}
         onclick={(event) => {
            event.stopPropagation();
            applyEffectToTargets(effect);
         }}
         testId="effect-tray-apply"
         tooltip={'effectTrayApply'}
      />
   </div>
</div>

<style lang="scss">
   .effect-tray-row {
      @include flex-row;
      @include flex-group-left;
      @include padding-standard;

      width: 100%;

      .effect-tray-row-icon {
         width: 32px;
         height: 32px;
         border: none;
         object-fit: contain;
      }

      .effect-tray-row-name {
         @include margin-left-standard;

         overflow: hidden;
         text-overflow: ellipsis;
         white-space: nowrap;
      }

      .effect-tray-row-rename {
         @include input;
         @include margin-left-standard;

         flex: 1;
      }

      .effect-tray-row-controls {
         @include flex-row;
         @include flex-group-right;

         margin-left: auto;
      }
   }
</style>
