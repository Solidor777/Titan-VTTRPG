<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import DocumentName from "~/documents/components/input/DocumentNameInput.svelte";
   import CharacterSheetAttributes from "~/actor/types/character/sheet/header/CharacterSheetAttributes.svelte";
   import CharacterSheetResistances from "~/actor/types/character/sheet/header/CharacterSheetResistances.svelte";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";
   import DocumentSelect from "~/documents/components/select/DocumentSelect.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
   const options = [
      {
         label: localize("minion"),
         value: "minion",
      },
      {
         label: localize("warrior"),
         value: "warrior",
      },
      {
         label: localize("elite"),
         value: "elite",
      },
      {
         label: localize("champion"),
         value: "champion",
      },
   ];
</script>

<div class="header">
   <!--Name and XP-->
   <div class="main-header">
      <!--Character name Sheet-->
      <div class="actor-name">
         <DocumentName />
      </div>

      <div class="type">
         <DocumentSelect {options} bind:value={$document.system.type} />
      </div>

      <!--Exp-->
      <div class="xp">
         <!--Available-->
         <div class="value">
            <Tag label={$document.system.xp} />
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
            margin-right: 0.25rem;
         }

         .type {
            margin-right: 0.25rem;
         }

         .xp {
            @include flex-row;
            @include flex-group-center;
            margin-right: 0.25rem;

            .value {
               @include flex-row;
               @include flex-group-center;
               margin-right: 0.25rem;
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
