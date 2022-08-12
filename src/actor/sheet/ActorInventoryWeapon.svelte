<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import { slide } from "svelte/transition";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // Reference to the docuement
   const document = getContext("DocumentSheetObject");

   // Reference to the application
   const application = getContext("external").application;

   // Reference to the weapon id
   export let id = void 0;

   // Collapsed object
   export let isExpandedObject = void 0;

   // Weapon list
   $: weapon = $document.items.get(id);
</script>

<!--Header-->
{#if weapon}
   <div class="item-header">
      <!--Name-->
      <div class="item-name">
         <EfxButton efx={ripple}>
            {weapon.name}
            <i class="fas fa-angle-double-down" />
         </EfxButton>
      </div>

      <!--Controls-->
      <div class="item-controls">
         <!--Toggle Eqipped button-->
         <div class="item-control-button">
            <EfxButton efx={ripple} on:click={application.toggleEquipped.bind(application, weapon._id)}>
               {localize("LOCAL.equipped.label")}:
               <div class="spacer" />
               <i class={weapon.system.equipped ? "fas fa-square-check" : "fas fa-square"} />
            </EfxButton>
         </div>

         <!--Edit Button-->
         <div class="item-control-button">
            <IconButton icon={"fas fa-pen-to-square"} on:click={application.editItem.bind(application, weapon._id)} />
         </div>

         <!--Delete Button-->
         <div class="item-control-button">
            <IconButton icon={"fas fa-trash"} on:click={application.deleteItem.bind(application, weapon._id)} />
         </div>
      </div>
   </div>
{/if}

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .item-header {
      @include flex-row;
      @include flex-space-between;
      width: 100%;
      font-size: 1rem;
      font-weight: bold;

      .item-name {
         @include flex-row;
         @include flex-group-left;
         width: 15rem;

         .fas {
            margin-left: 0.5rem;
         }
      }

      .item-controls {
         @include flex-row;
         @include flex-group-right;
         height: 100%;

         .item-control-button {
            &:not(:first-child) {
               margin-left: 0.5rem;
            }

            .spacer {
               width: 0.5rem;
            }
         }
      }
   }
</style>
