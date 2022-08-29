<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { slide } from "svelte/transition";
   import { getSpellRangeOptions } from "~/item/spell/SpellRangeOptions.js";
   import { getSpellRadiusOptions } from "~/item/spell/SpellRadiusOptions.js";
   import { getSpellIncreaseDecreaseSpeedOptions } from "~/item/spell/SpellIncreaseDecreaseSpeedOptions.js";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentSelect from "~/documents/components/DocumentSelect.svelte";
   import DocumentCheckboxInput from "~/documents/components/DocumentCheckboxInput.svelte";
   import DocumentResistanceSelectAllowNone from "~/documents/components/DocumentResistanceSelectAllowNone.svelte";
   import SpellSheetEnableAspectButton from "./SpellSheetEnableAspectButton.svelte";
   import SpellSheetToggleAspectOptionButton from "./SpellSheetToggleAspectOptionButton.svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // Document Setup
   const document = getContext("DocumentSheetObject");
   console.log($document.system.customAspects);
   function addCustomAspect() {
      $document.spell.addCustomAspect();
   }
</script>

<div class="aspects-tab">
   <ScrollingContainer>
      <ol class="aspects-list">
         <!--Each Aspect-->
         {#each $document.system.customAspects as aspect, idx}
            <li class="aspect">
               <!--Enable Header-->
               <div class="aspect-header">
                  {$document.system.customAspects[idx].label}
               </div>
            </li>
         {/each}
      </ol>
      <div class="add-aspect-button">
         <EfxButton efx={ripple} on:click={addCustomAspect}
            >{localize("LOCAL.addCustomAspect.label")}<i class="fas fa-circle-plus" /></EfxButton
         >
      </div>
   </ScrollingContainer>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .aspects-tab {
      width: 100%;
      height: 100%;

      .aspects-list {
         @include flex-column;
         @include flex-group-top;
         list-style: none;
         padding: 0;
         margin: 0;
         width: 100%;

         .aspect {
            @include flex-column;
            @include flex-group-top;
            width: 100%;
            margin: 0.25rem;

            .aspect-enable {
               @include flex-row;
               width: 100%;
            }

            .aspect-details {
               @include flex-column;
               @include flex-group-top;
               @include z-index-app;
               padding: 0.5rem;
               width: calc(100% - 30px);
               background-color: var(--label-background-color);
               border-right: var(--border-style);
               border-left: var(--border-style);
               border-bottom: var(--border-style);
               border-bottom-right-radius: var(--border-radius);
               border-bottom-left-radius: var(--border-radius);
               border-width: var(--border-width);
               border-color: var(--border-color-normal);
               font-size: 0.9rem;
               --font-size: 0.9rem;

               .row {
                  @include flex-row;
                  @include flex-group-center;
                  width: 100%;
                  &:not(:first-child) {
                     margin-top: 0.5rem;
                  }

                  .stat {
                     @include flex-row;
                     @include flex-group-center;
                     font-weight: bold;

                     .input {
                        margin-left: 0.25rem;
                     }
                  }
               }

               .toggles {
                  @include flex-row;
                  @include flex-group-center;
                  margin-top: 0.5rem;
                  flex-wrap: wrap;
                  width: 100%;
               }
            }
         }
      }

      .add-aspect-button {
         @include flex-row;

         .fas {
            margin-left: 0.25rem;
         }
      }
   }
</style>
