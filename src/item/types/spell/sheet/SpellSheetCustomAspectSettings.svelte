<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import { slide } from "svelte/transition";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import DocumentCheckboxInput from "~/documents/components/DocumentCheckboxInput.svelte";
   import DocumentResistanceSelect from "~/documents/components/DocumentResistanceSelect.svelte";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";

   // Document reference
   const document = getContext("DocumentStore");

   // Idx of the custom aspect being represented
   export let idx = void 0;
</script>

{#if $document.system.customAspects[idx]}
   <div class="aspect" transition:slide|local>
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
               {localize("cost")}:
            </div>

            <!--Input-->
            <div class="input">
               <DocumentIntegerInput bind:value={$document.system.customAspects[idx].cost} min={0} />
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
         <!--Resistance aspect-->
         <div class="stat">
            <!--Label-->
            <div class="label">
               {localize("resistanceCheck")}:
            </div>

            <!--Value-->
            <div class="input">
               <DocumentResistanceSelect
                  bind:value={$document.system.customAspects[idx].resistanceCheck}
                  allowNone={true}
               />
            </div>
         </div>
      </div>

      <div class="row">
         <!--Damage-->
         <div class="stat">
            <!--Label-->
            <div class="label">
               {localize("damage")}
            </div>

            <!--Value-->
            <div class="input checkbox">
               <DocumentCheckboxInput bind:value={$document.system.customAspects[idx].isDamage} />
            </div>
         </div>

         <!--Healing-->
         <div class="stat">
            <!--Label-->
            <div class="label">
               {localize("healing")}
            </div>

            <!--Value-->
            <div class="input checkbox">
               <DocumentCheckboxInput bind:value={$document.system.customAspects[idx].isHealing} />
            </div>
         </div>

         <!--Scaling-->
         <div class="stat">
            <!--Label-->
            <div class="label">
               {localize("scaling")}
            </div>

            <!--Value-->
            <div class="input checkbox">
               <DocumentCheckboxInput bind:value={$document.system.customAspects[idx].scaling} />
            </div>
         </div>
      </div>

      <!--Initial value-->
      {#if $document.system.customAspects[idx].scaling}
         <div class="row" transition:slide|local>
            <div class="stat">
               <!--Label-->
               <div class="label">
                  {localize("initialValue")}:
               </div>

               <!--Value-->
               <div class="input number">
                  <DocumentIntegerInput bind:value={$document.system.customAspects[idx].initialValue} min={0} />
               </div>
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .aspect {
      @include flex-column;
      @include flex-group-top;
      @include border;
      @include z-index-app;
      width: 100%;
      font-size: 1rem;
      padding: 0.25rem;
      background: var(--label-background-color);

      .aspect-header {
         @include flex-row;
         @include flex-space-between;
         box-sizing: border-box;
         width: 100%;
         font-weight: bold;
         padding: 0.5rem 0.5rem 0 0.5rem;

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
         @include border-top;
         margin-top: 0.5rem;
         width: 100%;
         padding: 0.5rem 0.5rem 0 0.5rem;
         font-size: 0.9rem;
         --font-size: 0.9rem;
         height: 2rem;

         .stat {
            @include flex-row;
            @include flex-group-center;

            &:not(:first-child) {
               @include border-left;
               height: 100%;
               margin-left: 0.5rem;
               padding-left: 0.5rem;
            }

            .label {
               @include flex-row;
               @include flex-group-center;
               font-weight: bold;
            }

            .input {
               @include flex-row;
               @include flex-group-center;

               &.checkbox {
                  margin-left: 0.25rem;
               }

               &:not(.checkbox) {
                  margin-left: 0.5rem;
               }

               &.number {
                  width: 3rem;
               }
            }
         }
      }

      &:not(:first-child) {
         margin-top: 0.25rem;
      }
   }
</style>
