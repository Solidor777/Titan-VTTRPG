<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import Text from '~/helpers/svelte-components/Text.svelte';

   /**
    * @typedef {object} MoveEffectToFolderDialogShellProps
    * @property {string} effectName - The name of the effect being moved.
    * @property {{ value: string, label: string }[]} folderOptions - The destination folder options.
    * @property {string} initialValue - The id of the effect's current folder, or '' for the root.
    */

   /** @type {MoveEffectToFolderDialogShellProps} */
   const { effectName, folderOptions, initialValue } = $props();

   /** @type {MoveEffectToFolderDialog} The Svelte component's owning application. */
   const application = getApplication();

   /** @type {string} The currently selected destination folder id ('' = pack root). */
   let selectedFolderId = $state(initialValue);

   /**
    * Commits the selected folder through the application callback, then closes the dialog.
    * @returns {void}
    */
   function onConfirmed() {
      void application.confirmationCallback(selectedFolderId);
      application.close();
   }
</script>

<div class="move-effect-dialog">
   <div class="header">
      {effectName}
   </div>

   <div class="section">
      {localize('effectTrayMoveToFolderPrompt')}
   </div>

   <div class="section">
      <Select
         options={folderOptions}
         testId="move-effect-folder-select"
         bind:value={selectedFolderId}
      />
   </div>

   <div class="button">
      <Button
         onclick={onConfirmed}
         testId="move-effect-confirm"
      >
         <Text text="effectTrayMoveToFolder"/>
      </Button>
   </div>

   <div class="button">
      <Button onclick={() => application.close()}>
         <Text text="cancel"/>
      </Button>
   </div>
</div>

<style lang="scss">
   .move-effect-dialog {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .header {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;

         width: 100%;
         font-weight: bold;
      }

      .section {
         @include flex-row;
         @include flex-group-center;
         @include padding-standard;

         width: 100%;
      }

      .button {
         @include flex-row;
         @include flex-group-center;
         @include margin-top-standard;

         width: 100%;
      }
   }
</style>
