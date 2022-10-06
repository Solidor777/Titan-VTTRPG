<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import DocumentName from "~/documents/components/input/DocumentNameInput.svelte";
   import CharacterSheetAttributes from "~/actor/types/character/sheet/header/CharacterSheetAttributes.svelte";
   import CharacterSheetResistances from "~/actor/types/character/sheet/header/CharacterSheetResistances.svelte";
   import ModTag from "~/helpers/svelte-components/tag/ModTag.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
</script>

<div class="header">
   <!--Name and XP-->
   <div class="main-header">
      <!--Character name Sheet-->
      <div class="actor-name">
         <DocumentName />
      </div>

      <!--Exp-->
      <div class="xp">
         <!--Available-->
         <div class="available" data-tooltip={localize("xpAvailable")}>
            <ModTag baseValue={0} currentValue={$document.system.xp.available} />
         </div>
         <div class="symbol">/</div>

         <!--Earned Input-->
         <div class="earned" data-tooltip={localize("xpEarned")}>
            <DocumentIntegerInput bind:value={$document.system.xp.earned} />
         </div>

         <!--Label-->
         <div class="label">{localize("xp")}</div>
      </div>
   </div>

   <!--Attributes and Resistances-->
   <div class="stats">
      <!--Attributes-->
      <div class="section">
         <CharacterSheetAttributes />
      </div>

      <!--Resistances-->
      <div class="section">
         <CharacterSheetResistances />
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .header {
      @include panel-1;
      @include border;
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      padding: 0.25rem;

      .main-header {
         @include flex-row;
         @include flex-space-between;
         width: 100%;

         .actor-name {
            @include flex-row;
            @include flex-group-left;
            flex: auto;
            margin-right: 0.5rem;
         }

         .xp {
            @include flex-row;
            @include flex-group-center;
            margin-right: 0.25rem;

            .available {
               @include flex-row;
               @include flex-group-center;
               width: 2.5rem;
               height: var(--input-height);
            }

            .symbol {
               @include flex-row;
               margin: 0.25rem;
            }

            .earned {
               @include flex-row;
               @include flex-group-center;
               margin-right: 0.5rem;
               width: 2.5rem;
            }

            .label {
               @include flex-row;
               @include flex-group-center;
               font-weight: bold;
            }
         }
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         @include border-top;
         width: 100%;
         margin-top: 0.25rem;
         padding-top: 0.25rem;

         .section {
            @include flex-row;
            @include flex-group-center;
            width: 100%;

            &:not(:first-child) {
               @include border-left;
               margin-left: 0.25rem;
               padding-left: 0.25rem;
            }
         }
      }
   }
</style>
