<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import CharacterSheetMod from "~/actor/types/character/sheet/base/CharacterSheetMod.svelte";
   import CharacterRating from "~/actor/types/character/sheet/base/CharacterRating.svelte";
   import CharacterSpeed from "~/actor/types/character/sheet/base/CharacterSpeed.svelte";
   import CharacterSheetResources from "~/actor/types/character/sheet/base/CharacterSheetResources.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
</script>

<div class="sidebar">
   <!--Character Portrait-->
   <div class="portrait">
      <DocumentImagePicker path={"img"} alt={"character portrait"} />
   </div>

   <!--Resources-->
   <div class="resources">
      <CharacterSheetResources />
   </div>

   <!--Ratings-->
   <div class="mods">
      {#each Object.entries($document.system.mod) as [key]}
         <div class="mod">
            <CharacterSheetMod bind:key />
         </div>
      {/each}
   </div>

   <!--Ratings-->
   <div class="ratings">
      {#each Object.entries($document.system.rating) as [key]}
         <div class="rating">
            <CharacterRating bind:key />
         </div>
      {/each}
   </div>

   <!--Speeds-->
   <div class="speeds">
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
      padding: 0.5rem;

      .portrait {
         width: 10rem;
         --border-style: none;
      }

      .resources {
         @include flex-column;
         width: 100%;
      }

      .mods {
         @include flex-column;
         @include flex-group-top;
         @include border-bottom;
         width: 100%;
         margin-top: 0.5rem;
         padding-bottom: 0.5rem;

         .mod {
            width: 100%;
            margin-top: 0.25rem;

            &:not(:last-child) {
               @include border-bottom;
               padding-bottom: 0.25rem;
            }
         }
      }

      .ratings {
         @include flex-column;
         @include flex-group-top;
         @include border-bottom;
         width: 100%;
         margin-top: 0.5rem;
         padding-bottom: 0.5rem;

         .rating {
            width: 100%;
            margin-top: 0.25rem;

            &:not(:last-child) {
               @include border-bottom;
               padding-bottom: 0.25rem;
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
