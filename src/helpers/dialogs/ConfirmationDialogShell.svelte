<svelte:options accessors={true}/>

<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import getApplication from '~/helpers/utility-functions/GetApplication';
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   /** @type string[] Header lines. */
   export let headers = void 0;

   /** @type string Message explaining the dialog. */
   export let message = void 0;

   /** @type string Label for the confirmation button. */
   export let confirmLabel = void 0;

   /** @type ConfirmationDialog Application reference. */
   const application = getApplication();

   /**
    * Called when confirmation button clicked. /*.
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
         on:click={onConfirmed}
      >
         {confirmLabel}
      </Button>
   </div>

   <!--Cancel button-->
   <div class="button">
      <Button
         on:click={() => {
            application.close();
         }}
      >{localize('cancel')}
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

         padding: var(--titan-padding-standard);
      }

      .button {
         @include flex-row;
         @include flex-group-center;

         width: 100%;
         margin-top: var(--titan-padding-standard);

         --titan-button-border-radius: var(--titan-button-chat-message-border-radius);
      }
   }
</style>
