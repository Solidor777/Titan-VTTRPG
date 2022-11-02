<svelte:options accessors={true} />

<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";

   // Character Sheet
   export let sheet = void 0;
   export let itemName = void 0;
   export let itemId = void 0;

   const application = getContext("external").application;
</script>

<div class="add-item-dialog">
   <!--Header-->
   <div class="header">
      {sheet.reactive.document.name}
   </div>
   <div class="header">
      {itemName}
   </div>

   <div class="message">
      {localize("confirmDeleteItem")}
   </div>

   <!--Buttons-->
   <div class="button">
      <EfxButton
         on:click={() => {
            sheet.deleteItem(itemId, true);
            application.close();
         }}
      >
         {localize("deleteItem")}
      </EfxButton>
   </div>

   <div class="button">
      <EfxButton
         on:click={() => {
            application.close();
         }}
         >{localize("cancel")}
      </EfxButton>
   </div>
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .add-item-dialog {
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

      .message {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;
         padding: 0.25rem;
      }

      .button {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
         margin-top: 0.25rem;
         --button-border-radius: 10px;
      }
   }
</style>
