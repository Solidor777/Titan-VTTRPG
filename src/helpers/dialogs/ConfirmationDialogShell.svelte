<script>
   import Text from '~/helpers/svelte-components/Text.svelte';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   /**
    * @typedef {object} ConfirmationDialogShellProps
    * @property {string[]} [headers] Header lines.
    * @property {string} [message] Message explaining the dialog.
    * @property {string} [confirmLabel] Label for the confirmation button.
    */

   /** @type {ConfirmationDialogShellProps} */
   const {
      headers = undefined,
      message = undefined,
      confirmLabel = undefined,
   } = $props();

   /** @type {ConfirmationDialog} The Svelte Component's Application. */
   const application = getApplication();

   /**
    * Called when the confirmation button is clicked.
    */
   function onConfirmed() {
      application.confirmationCallback();
      application.close();
   }
</script>

<div class="confirmation-dialog">
   <!--Headers-->
   {#each headers as header}
      <div class="header">
         {header}
      </div>
   {/each}

   <!--Message-->
   <div class="section">
      {message}
   </div>

   <!--Confirm Button-->
   <div class="button">
      <Button
         onclick={onConfirmed}
      >
         {confirmLabel}
      </Button>
   </div>

   <!--Cancel button-->
   <div class="button">
      <Button
         onclick={() => {
            application.close();
         }}
      ><Text text="cancel"/>
      </Button>
   </div>
</div>

<style lang="scss">
   .confirmation-dialog {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .header {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;

         width: 100%;
         font-weight: bold;
         flex-wrap: wrap;
      }

      .section {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;
         @include padding-standard;
      }

      .button {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         @include margin-top-standard;

         --titan-button-border-radius: var(--titan-button-border-radius);
      }
   }
</style>
