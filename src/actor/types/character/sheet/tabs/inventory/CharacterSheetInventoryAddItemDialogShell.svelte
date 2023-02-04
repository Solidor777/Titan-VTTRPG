<svelte:options accessors={true} />

<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   import Select from "~/helpers/svelte-components/select/Select.svelte";

   // Character Sheet
   export let actor = void 0;

   const application = getContext("external").application;

   const options = [
      {
         value: "armor",
         label: localize("armor"),
      },
      {
         value: "commodity",
         label: localize("commodity"),
      },
      {
         value: "equipment",
         label: localize("equipment"),
      },
      {
         value: "shield",
         label: localize("shield"),
      },
      {
         value: "weapon",
         label: localize("weapon"),
      },
   ];

   let value = "armor";
</script>

<div class="add-item-dialog">
   <!--Header-->
   <div class="header">
      {actor.name}
   </div>

   <!--Type Select-->
   <div class="select">
      <Select {options} bind:value />
   </div>

   <!--Buttons-->
   <div class="button">
      <EfxButton
         on:click={() => {
            actor.addItem(value);
            application.close();
         }}
      >
         {localize("addNewItem")}
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
   @import "../../../../../../Styles/Mixins.scss";

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

      .select {
         @include flex-row;
         @include flex-group-center;

         width: 100%;
         margin-top: 0.25rem;
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
