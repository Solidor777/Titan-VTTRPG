<svelte:options accessors={true} />

<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import DocumentName from "~/documents/components/DocumentName.svelte";
   import DocumentRaritySelect from "~/documents/components/DocumentRaritySelect.svelte";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";

   // Setup
   const document = getContext("DocumentSheetObject");
</script>

<!--Header-->
<div class="header">
   <div class="row">
      <div class="label">
         <!--Item portrait-->
         <div class="portrait">
            <DocumentImagePicker path={"img"} alt={"item portrait"} />
         </div>
         <!--Item name-->
         <div class="name">
            <DocumentName />
         </div>
      </div>

      <!--Stats-->
      <div class="stats">
         <!--Rarity-->
         <div class="stat-label">
            {localize("LOCAL.rarity.label")}
         </div>
         <div class="stat-input">
            <DocumentRaritySelect bind:value={$document.system.rarity} />
         </div>

         <!--Rarity-->
         <div class="stat-label">
            {localize("LOCAL.expCost.label")}
         </div>
         <div class="stat-input">
            <DocumentIntegerInput bind:value={$document.system.expCost} min={0} />
         </div>
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";
   .header {
      @include border;
      @include flex-column;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.5rem;

      .row {
         @include flex-row;
         @include flex-space-between;
         width: 100%;

         .label {
            @include flex-row;
            @include flex-group-center;
            width: 100%;

            .portrait {
               width: 5rem;
               --border-style: none;
            }
         }

         .stats {
            @include grid(2);
            width: 100%;
            box-sizing: border-box;
            margin-left: 0.5rem;

            .stat-label {
               @include flex-row;
               @include flex-group-right;
               font-weight: bold;
            }
         }
      }
   }
</style>
