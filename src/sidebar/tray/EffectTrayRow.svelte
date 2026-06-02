<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import applyEffectToTargets from '~/helpers/utility-functions/ApplyEffectToTargets.js';
   import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog.js';
   import focusOnMount from '~/helpers/svelte-actions/FocusOnMount.js';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { DELETE_ICON, DUPLICATE_ICON, SHEET_ICON } from '~/system/Icons.js';

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

   /** @type {string} The localized label for the Open Sheet button. */
   const openLabel = localize('effectTrayOpen');

   /** @type {string} The localized label for the Duplicate button. */
   const duplicateLabel = localize('effectTrayDuplicate');

   /** @type {string} The localized label for the Delete button. */
   const deleteLabel = localize('effectTrayDelete');

   /** @type {boolean} Whether the name is currently being edited inline. */
   let isRenaming = $state(false);

   /** @type {string} The working value of the inline rename input. */
   let renameValue = $state('');

   /** @type {boolean} Whether the current rename is being cancelled, so the blur commit is skipped. */
   let isCancellingRename = false;

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

   /**
    * Prompts for confirmation, then deletes the effect from its pack on confirm.
    * @returns {void}
    */
   function requestDelete() {
      new ConfirmationDialog(
         deleteLabel,
         [effect.name],
         localize('effectTrayConfirmDelete.desc'),
         deleteLabel,
         () => effect.delete(),
      ).render(true);
   }
</script>

<div
   class="effect-tray-row"
   data-effect-id={effect.id}
   data-testid="effect-tray-row"
   draggable={true}
   ondragstart={onDragStart}
   role="listitem"
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
      <!--Apply to Target button-->
      <IconButton
         icon="fa-solid fa-bullseye-arrow"
         label={applyLabel}
         onclick={() => applyEffectToTargets(effect)}
         testId="effect-tray-apply"
         tooltip={applyLabel}
      />

      {#if trayState.canEdit}
         <!--Open Sheet button-->
         <IconButton
            icon={SHEET_ICON}
            label={openLabel}
            onclick={() => effect.sheet.render(true)}
            testId="effect-tray-open"
            tooltip={openLabel}
         />

         <!--Duplicate button-->
         <IconButton
            icon={DUPLICATE_ICON}
            label={duplicateLabel}
            onclick={() => trayState.duplicateEffect(effect)}
            testId="effect-tray-duplicate"
            tooltip={duplicateLabel}
         />

         <!--Delete button-->
         <IconButton
            icon={DELETE_ICON}
            label={deleteLabel}
            onclick={requestDelete}
            testId="effect-tray-delete"
            tooltip={deleteLabel}
         />
      {/if}
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
