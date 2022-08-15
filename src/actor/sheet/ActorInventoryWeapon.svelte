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
   $: item = $document.items.get(id);
</script>

{#if item}
   <div class="actor-inventory-weapon-sheet">
      <!--Header-->
      <div class="item-header">
         <!--Expand button-->
         <div class="item-expand-button">
            <EfxButton
               efx={ripple}
               on:click={() => {
                  isExpandedObject[id] = !isExpandedObject[id];
               }}
            >
               <div class="item-expand-button-inner">
                  <!--Image-->
                  <img class="item-image" src={item.img} alt="item" />

                  <!--Name-->
                  <div>{item.name}</div>

                  <!--Icon-->
                  <i class="fas fa-angle-double-down" />
               </div>
            </EfxButton>
         </div>

         <!--Controls-->
         <div class="item-controls">
            <!--Toggle Equipped button-->
            <div class="item-control-button">
               <EfxButton efx={ripple} on:click={application.toggleEquipped.bind(application, item._id)}>
                  {localize("LOCAL.equipped.label")}:
                  <div class="spacer" />
                  <i class={item.system.equipped ? "fas fa-square-check" : "fas fa-square"} />
               </EfxButton>
            </div>

            <!--Send to Chat button-->
            <div class="item-control-button">
               <IconButton icon={"fas fa-comment"} on:click={$document.sendItemToChat(item._id)} />
            </div>

            <!--Edit Button-->
            <div class="item-control-button">
               <IconButton icon={"fas fa-pen-to-square"} on:click={application.editItem.bind(application, item._id)} />
            </div>

            <!--Delete Button-->
            <div class="item-control-button">
               <IconButton icon={"fas fa-trash"} on:click={application.deleteItem.bind(application, item._id)} />
            </div>
         </div>
      </div>

      <!--Expandable content-->
      {#if isExpandedObject[id] === true}
         <div class="item-expandable-content" transition:slide|local>
            <!--Item Description-->
            <div class="item-description">Temporary Description</div>

            <!--Attack Description-->
            <div class="attack-description">Temporary Attack Description</div>

            <!--Footer-->
            <div class="item-footer">
               <!--Rarity-->
               <div class="item-footer-field {item.system.rarity}">
                  {localize(`LOCAL.${item.system.rarity}.label`)}
               </div>

               <!--Value-->
               <div class="item-footer-field">
                  <div class="item-footer-label">
                     {localize("LOCAL.value.label")}:
                  </div>
                  <div class="item-footer-value">
                     {item.system.value}
                  </div>
               </div>
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .actor-inventory-weapon-sheet {
      @include flex-column;
      width: 100%;

      .item-header {
         @include flex-row;
         @include flex-space-between;
         width: 100%;
         font-size: 1rem;
         font-weight: bold;

         .item-expand-button {
            @include flex-row;

            .item-expand-button-inner {
               @include flex-row;
               @include flex-space-between;
               flex-wrap: wrap;
               width: 100%;
               height: 100%;

               :not(:first-child) {
                  margin-left: 0.5rem;
               }

               .item-image {
                  @include flex-row;
                  @include flex-group-center;
                  margin-left: 0.25rem;
                  width: 2rem;
                  border: none;
                  border-radius: 10px;
                  padding: 0.1rem;
                  background-color: black;
               }

               .fas {
                  margin-right: 0.25rem;
               }
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

      .item-expandable-content {
         .item-description {
            margin-top: 0.5rem;
            font-size: 0.9rem;
         }

         .attack-description {
            @include border-top;
            @include border-bottom;
            padding: 0.5rem;
            margin-top: 0.5rem;
            font-size: 0.9rem;
         }

         .item-footer {
            @include flex-row;
            @include flex-space-evenly;
            font-size: 0.9rem;
            font-weight: bold;

            .item-footer-field {
               @include flex-row;
               @include border;
               margin-top: 0.5rem;
               padding: 0.25rem;
               background-color: var(--label-background-color);

               &.uncommon {
                  background-color: var(--uncommon-color-bright);
               }

               &.rare {
                  background-color: var(--rare-color-bright);
               }

               &.unique {
                  background-color: var(--unique-color-bright);
               }

               .item-footer-value {
                  margin-left: 0.5rem;
               }
            }
         }
      }
   }
</style>
