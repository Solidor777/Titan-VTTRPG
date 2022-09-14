<svelte:options accessors={true} />

<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import DocumentName from "~/documents/components/DocumentName.svelte";
   import DocumentRaritySelect from "~/documents/components/DocumentRaritySelect.svelte";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";
   import DocumentCheckboxInput from "~/documents/components/DocumentCheckboxInput.svelte";

   // Setup
   const document = getContext("DocumentSheetObject");
</script>

<!--Header-->
<div class="header">
   <div class="main-label">
      <!--Portrait-->
      <div class="portrait">
         <DocumentImagePicker path={"img"} alt={"item portrait"} />
      </div>

      <!--Item name-->
      <div class="label-stats">
         <div class="name">
            <DocumentName />
         </div>

         <!--Secondary Stats-->
         <div class="secondary-stats">
            <!--Rarity-->
            <div class="stat">
               <div class="label">
                  {localize("LOCAL.rarity.label")}
               </div>
               <div class="input">
                  <DocumentRaritySelect bind:value={$document.system.rarity} />
               </div>
            </div>

            <!--EXP Cost-->
            <div class="stat">
               <div class="label">
                  {localize("LOCAL.expCost.label")}
               </div>
               <div class="input integer">
                  <DocumentIntegerInput bind:value={$document.system.expCost} min={0} />
               </div>
            </div>
         </div>
      </div>
   </div>

   <div class="ability-types">
      <!--Action-->
      <div class="checkbox">
         <div class="label">
            {localize("LOCAL.action.label")}
         </div>
         <div class="input">
            <DocumentCheckboxInput bind:value={$document.system.action} />
         </div>
      </div>

      <!--Reaction-->
      <div class="checkbox">
         <div class="label">
            {localize("LOCAL.reaction.label")}
         </div>
         <div class="input">
            <DocumentCheckboxInput bind:value={$document.system.reaction} />
         </div>
      </div>

      <!--Passive-->
      <div class="checkbox">
         <div class="label">
            {localize("LOCAL.passive.label")}
         </div>
         <div class="input">
            <DocumentCheckboxInput bind:value={$document.system.passive} />
         </div>
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";
   .header {
      @include border;
      @include flex-row;
      @include flex-space-between;
      width: 100%;
      padding: 0.5rem;

      .main-label {
         @include flex-row;
         @include flex-group-left;
         width: 100%;

         .portrait {
            width: 5rem;
            --border-style: none;
         }

         .label-stats {
            @include flex-column;
            @include flex-group-top-left;
            width: calc(100% - 5.5rem);
            margin-left: 0.5rem;

            .name {
               @include flex-row;
               @include flex-group-left;
               width: 100%;
            }

            .secondary-stats {
               @include flex-row;
               @include flex-group-left;
               margin-top: 0.5rem;
               width: 100%;

               .stat {
                  @include flex-row;
                  @include flex-group-left;

                  &:not(:first-child) {
                     @include border-left;
                     margin-left: 0.5rem;
                     padding-left: 0.5rem;
                  }

                  .label {
                     @include flex-row;
                     @include flex-group-left;
                     font-weight: bold;
                     margin-right: 0.5rem;
                  }

                  .input {
                     @include flex-row;
                     @include flex-group-center;

                     &.integer {
                        --input-width: 3rem;
                     }
                  }
               }
            }
         }
      }
      .ability-types {
         @include flex-column;
         @include flex-group-top;
         margin-right: 0.5rem;
         margin-left: 1.5rem;

         .checkbox {
            @include flex-row;
            @include flex-group-right;
            width: 100%;

            .label {
               @include flex-row;
               @include flex-group-right;
               font-weight: bold;
            }

            .input {
               @include flex-row;
               @include flex-group-left;
               width: 1rem;
            }
         }
      }
   }
</style>
