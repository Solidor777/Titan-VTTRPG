<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import CharacterSpeed from "~/actor/types/character/sheet/sidebar/CharacterSpeed.svelte";
   import CharacterSheetResources from "~/actor/types/character/sheet/sidebar/CharacterSheetResources.svelte";
   import CharacterSheetMods from "~/actor/types/character/sheet/sidebar/CharacterSheetMods.svelte";
   import CharacterSheetRatings from "../character/sheet/sidebar/CharacterSheetRatings.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
</script>

<div class="sidebar">
   <!--Character Portrait-->
   <div class="portrait">
      <DocumentImagePicker path={"img"} alt={"character portrait"} />
   </div>

   <div class="sections">
      <!--Resources-->
      <div class="section">
         <CharacterSheetResources />
      </div>

      <!--Mods-->
      <div class="section">
         <CharacterSheetMods />
      </div>

      <!--Ratings-->
      <div class="section">
         <CharacterSheetRatings />
      </div>
   </div>

   <!--Speeds-->
   <div class="section">
      <div class="label">
         <div class="name">{localize("speed")}</div>
         <div class="base">{localize("base")}</div>
         <div class="mod">{localize("mod")}</div>
      </div>
      {#each Object.entries($document.system.speed) as [key]}
         <div class="speed">
            <CharacterSpeed bind:key />
         </div>
      {/each}
   </div>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .sidebar {
      @include border;
      @include flex-column;
      @include flex-group-top;
      @include panel-2;
      height: 100%;
      width: 100%;
      padding: 0.25rem;

      .portrait {
         width: 10rem;
         --border-style: none;
      }

      .sections {
         @include flex-column;
         @include flex-group-top;
         width: 100%;

         .section {
            @include flex-column;
            @include flex-group-top;
            width: 100%;

            &:not(:first-child) {
               @include border-top;
               margin-top: 0.25rem;
               padding-top: 0.25rem;
            }
         }
      }

      .speeds {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         margin-top: 0.5rem;

         .label {
            @include flex-row;
            @include flex-group-left;
            @include font-size-normal;
            font-weight: bold;
            width: 100%;

            .name {
               @include flex-row;
               text-align: left;
               width: 5rem;
            }
            .base {
               margin-left: 0.325rem;
               width: 2.5rem;
            }

            .mod {
               width: 2.5rem;
               margin-left: 0.875rem;
            }
         }

         .speed {
            width: 100%;
            margin-top: 0.25rem;

            &:not(:last-child) {
               @include border-bottom;
               padding-bottom: 0.25rem;
            }
         }
      }
   }
</style>
