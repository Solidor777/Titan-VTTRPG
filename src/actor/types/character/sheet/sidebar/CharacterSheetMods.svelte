<script>
   import { getContext } from "svelte";
   import CharacterSheetMod from "./CharacterSheetMod.svelte";

   // The Character Data
   const document = getContext("DocumentStore");

   // Map of icons to use for the mods
   const modIcons = {
      armor: "helmet-battle",
      damage: "bolt",
      healing: "heart",
   };
</script>

<div class="mods">
   {#each Object.entries($document.system.mod) as [key]}
      <div class="mod">
         <CharacterSheetMod {key} icon={modIcons[key]} />
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .mods {
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      height: 100%;

      .mod {
         @include flex-row;
         @include flex-group-center;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            margin-top: 0.25rem;
            padding-top: 0.25rem;
         }
      }
   }
</style>
