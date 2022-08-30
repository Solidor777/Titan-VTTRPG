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
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";

   // Document Setup
   const document = getContext("DocumentSheetObject");
</script>

<div class="aspects-tab">
   <ScrollingContainer>
      <ol class="aspects-list">
         <!--Each Aspect-->
         {#each $document.system.customAspects as aspect, idx}
            <li class="aspect" transition:slide|local>
               <!--Header-->
               <div class="aspect-header">
                  <!--Label-->
                  <div class="label-input">
                     <DocumentTextInput bind:value={$document.system.customAspects[idx].label} />
                  </div>

                  <!--Cost-->
                  <div class="aspect-cost">
                     <!--Label-->
                     <div class="label">
                        {localize("LOCAL.cost.label")}:
                     </div>

                     <!--Input-->
                     <div class="input">
                        <DocumentIntegerInput bind:value={$document.system.customAspects[idx].cost} positive={true} />
                     </div>
                  </div>

                  <!--Delete button-->
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

               <div class="row">
                  <!--Resistance Check-->
                  <div class="stat">
                     <!--Label-->
                     <div class="label">
                        {localize("LOCAL.resistanceCheck.label")}:
                     </div>

                     <!--Value-->
                     <div class="input">
                        <DocumentResistanceSelectAllowNone
                           bind:value={$document.system.customAspects[idx].resistanceCheck}
                        />
                     </div>
                  </div>

                  <div class="divider" />

                  <!--Overcast-->
                  <div class="stat">
                     <!--Label-->
                     <div class="label">
                        {localize("LOCAL.overcast.label")}:
                     </div>

                     <!--Value-->
                     <div class="input checkbox">
                        <DocumentCheckboxInput bind:value={$document.system.customAspects[idx].overcast} />
                     </div>
                  </div>
               </div>

               <!--Initial value-->
               {#if $document.system.customAspects[idx].overcast}
                  <div class="row" transition:slide|local>
                     <div class="stat">
                        <!--Label-->
                        <div class="label">
                           {localize("LOCAL.initialValue.label")}:
                        </div>

                        <!--Value-->
                        <div class="input number">
                           <DocumentIntegerInput
                              bind:value={$document.system.customAspects[idx].initialValue}
                              positive={true}
                           />
                        </div>
                     </div>
                  </div>
               {/if}
            </li>{/each}
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
            padding: 0.25rem;
            background-color: var(--label-background-color);

            .aspect-header {
               @include flex-row;
               @include flex-space-between;
               box-sizing: border-box;
               width: 100%;
               font-weight: bold;
               padding: 0.25rem;

               .aspect-cost {
                  @include flex-row;
                  @include flex-group-center;
                  height: 100%;

                  .input {
                     margin-left: 0.25rem;
                     width: 3rem;
                  }
               }

               .label-input {
                  @include flex-row;
                  @include flex-group-center;
                  height: 100%;
                  --input-height: 100%;
               }
            }

            .row {
               @include flex-row;
               @include flex-group-center;
               font-size: 0.9rem;
               --font-size: 0.9rem;
               margin-top: 0.25rem;

               .stat {
                  @include flex-row;
                  @include flex-group-center;

                  .label {
                     font-weight: bold;
                  }

                  .input {
                     &:not(.checkbox) {
                        margin-left: 0.5rem;
                     }

                     &.number {
                        width: 3rem;
                     }
                  }
               }

               .divider {
                  @include border-left;
                  height: 100%;
                  margin-left: 0.5rem;
                  padding-right: 0.5rem;
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
