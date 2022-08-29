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
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";

   // Document Setup
   const document = getContext("DocumentSheetObject");
</script>

<div class="aspects-tab">
   <ScrollingContainer>
      <ol class="aspects-list">
         <!--Each Aspect-->
         {#each $document.system.customAspects as aspect, idx}
            <li class="aspect">
               <!--Enable Header-->
               <div class="aspect-header">
                  <div class="label-input">
                     <DocumentTextInput bind:value={$document.system.customAspects[idx].label} />
                  </div>
                  <div>
                     <IconButton
                        icon={"fas fa-trash"}
                        efx={ripple}
                        on:click={() => {
                           $document.spell.removeCustomAspect(idx);
                        }}
                     />
                  </div>
               </div>
            </li>
         {/each}
      </ol>
      <div class="add-aspect-button">
         <EfxButton
            efx={ripple}
            on:click={() => {
               $document.spell.addCustomAspect();
            }}>{localize("LOCAL.addCustomAspect.label")}<i class="fas fa-circle-plus" /></EfxButton
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
            @include border;
            width: 100%;
            font-size: 1rem;

            .aspect-header {
               @include flex-row;
               @include flex-space-between;
               box-sizing: border-box;
               width: 100%;
               font-weight: bold;
               padding: 0.25rem;

               .label-input {
                  @include flex-row;
                  @include flex-group-center;
                  height: 100%;
                  --input-height: 100%;
               }
            }

            &:not(:first-child) {
               margin-top: 0.25rem;
            }
         }
      }

      .add-aspect-button {
         @include flex-row;
         margin-top: 0.25rem;

         .fas {
            margin-left: 0.25rem;
         }
      }
   }
</style>
