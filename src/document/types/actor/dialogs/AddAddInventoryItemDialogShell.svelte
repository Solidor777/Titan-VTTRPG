<svelte:options accessors={true}/>

<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import getApplication from '~/helpers/utility-functions/GetApplication';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import InventoryItemTypeSelect from '~/helpers/svelte-components/select/InventoryItemTypeSelect.svelte';

   /** @type TitanActor Reference to the Actor this dialog is for. */
   export let actor = void 0;

   /** @type SvelteApp The Svelte Component's Application. */
   const application = getApplication();

   /** @type {string} The currently selected item type. */
   let value = 'armor';

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
      <Button on:click={onConfirmed}>
         {localize('addNewItem')}
      </Button>
   </div>

   <!--Canceled button-->
   <div class="button">
      <Button on:click={onCanceled}>
         {localize('cancel')}
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
         margin-top: var(--titan-spacing-standard);
      }

      .button {
         @include flex-row;
         @include flex-group-center;

         width: 100%;
         margin-top: var(--titan-spacing-standard);

         --titan-button-border-radius: var(--titan-button-border-radius);
      }
   }
</style>
