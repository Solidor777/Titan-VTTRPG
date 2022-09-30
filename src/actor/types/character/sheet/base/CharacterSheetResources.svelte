<script>
   import { getContext } from "svelte";
   import CharacterSheetResource from "~/actor/types/character/sheet/base/CharacterSheetResource.svelte";
   import CharacterSheetArmor from "./CharacterSheetModArmor.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
</script>

<!--Resources-->
<div class="resources">
   <CharacterSheetArmor />
   <!--Each Resource Meter-->
   {#each Object.entries($document.system.resource) as [key]}
      <div class="resource {key}">
         <CharacterSheetResource {key} />
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .resources {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .resource {
         @include flex-row;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            padding-top: 0.25rem;
            margin-top: 0.25rem;
         }
      }
   }
</style>
