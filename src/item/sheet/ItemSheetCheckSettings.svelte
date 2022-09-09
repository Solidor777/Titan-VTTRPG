<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { slide } from "svelte/transition";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";
   import DocumentResistanceSelect from "~/documents/components/DocumentResistanceSelect.svelte";
   import DocumentCheckboxInput from "~/documents/components/DocumentCheckboxInput.svelte";

   // Document reference
   const document = getContext("DocumentSheetObject");

   // Idx of the reference
   export let idx = void 0;

   // Resistance options
   const resistanceSelectOptions = [
      {
         label: localize("LOCAL.reflexes.label"),
         value: "reflexes",
      },
      {
         label: localize("LOCAL.resilience.label"),
         value: "resilience",
      },
      {
         label: localize("LOCAL.willpower.label"),
         value: "willpower",
      },
      {
         label: localize("LOCAL.none.label"),
         value: "none",
      },
   ];
</script>

<div class="check">
   <!--Header-->
   <div class="check-header">
      <!--Label-->
      <div class="label-input">
         <DocumentTextInput bind:value={$document.system.check[idx].label} />
      </div>

      <!--Cost-->
      <div class="check-cost">
         <!--Label-->
         <div class="label">
            {localize("LOCAL.cost.label")}:
         </div>

         <!--Input-->
         <div class="input">
            <DocumentIntegerInput bind:value={$document.system.check[idx].resolveCost} min={0} />
         </div>
      </div>

      <!--Delete button-->
      <div>
         <IconButton
            icon={"fas fa-trash"}
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
            <DocumentResistanceSelect
               bind:value={$document.system.check[idx].resistanceCheck}
               options={resistanceSelectOptions}
            />
         </div>
      </div>
   </div>

   <div class="row">
      <!--Damage-->
      <div class="stat">
         <!--Label-->
         <div class="label">
            {localize("LOCAL.damage.label")}
         </div>

         <!--Value-->
         <div class="input checkbox">
            <DocumentCheckboxInput bind:value={$document.system.check[idx].isDamage} />
         </div>
      </div>

      <!--Healing-->
      <div class="stat">
         <!--Label-->
         <div class="label">
            {localize("LOCAL.healing.label")}
         </div>

         <!--Value-->
         <div class="input checkbox">
            <DocumentCheckboxInput bind:value={$document.system.check[idx].isHealing} />
         </div>
      </div>
   </div>

   <!--Initial value-->
   {#if $document.system.check[idx].isDamage || $document.system.check[idx].isHealing}
      <div class="row" transition:slide|local>
         <div class="stat">
            <!--Label-->
            <div class="label">
               {localize("LOCAL.initialValue.label")}:
            </div>

            <!--Value-->
            <div class="input number">
               <DocumentIntegerInput bind:value={$document.system.check[idx].initialValue} min={0} />
            </div>
         </div>

         <!--Scaling-->
         <div class="stat">
            <!--Label-->
            <div class="label">
               {localize("LOCAL.scaling.label")}
            </div>

            <!--Value-->
            <div class="input checkbox">
               <DocumentCheckboxInput bind:value={$document.system.check[idx].scaling} />
            </div>
         </div>
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .check {
      @include flex-column;
      @include flex-group-top;
      @include border;
      width: 100%;
      font-size: 1rem;
      padding: 0.25rem;
      background-color: var(--label-background-color);

      .check-header {
         @include flex-row;
         @include flex-space-between;
         box-sizing: border-box;
         width: 100%;
         font-weight: bold;
         padding: 0.25rem;

         .check-cost {
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

            &:not(:first-child) {
               @include border-left;
               height: 100%;
               margin-left: 0.5rem;
               padding-left: 0.5rem;
            }

            .label {
               font-weight: bold;
            }

            .input {
               &.checkbox {
                  margin-right: 0.25rem;
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
