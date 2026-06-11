<script>
   import Text from '~/helpers/svelte-components/Text.svelte';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import InventoryItemTypeSelect from '~/helpers/svelte-components/input/select/InventoryItemTypeSelect.svelte';

   /**
    * @typedef {object} AddAddInventoryItemDialogShellProps
    * @property {TitanActor} [actor] Reference to the Actor this dialog is for.
    */

   /** @type {AddAddInventoryItemDialogShellProps} */
   const { actor = undefined } = $props();

   /** @type {SvelteApp} The Svelte Component's Application. */
   const application = getApplication();

   /** @type {string} The currently selected item type. */
   let value = $state('armor');

   /**
    * Called when the selection is confirmed.
    */
   function onConfirmed() {
      actor.createItemFromType(value);
      application.close();
   }

   /**
    * Called when the selection is canceled.
    */
   function onCanceled() {
      application.close();
   }
</script>

<div class="confirmation-dialog">
   <!--Header-->
   <div class="header">
      {actor.name}
   </div>

   <!--Type Select-->
   <div class="select">
      <InventoryItemTypeSelect bind:value/>
   </div>

   <!--Confirmed button-->
   <div class="button">
      <Button onclick={onConfirmed}>
         <Text text="addNewItem"/>
      </Button>
   </div>

   <!--Canceled button-->
   <div class="button">
      <Button onclick={onCanceled}>
         <Text text="cancel"/>
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

      .select {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         @include margin-top-standard;
      }

      .button {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         @include margin-top-standard;

      }
   }
</style>
