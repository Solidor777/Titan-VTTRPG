<script>
   import { getContext } from "svelte";
   import ActorItemCheck from "./ActorItemCheck.svelte";

   // Reference to the docuement
   const document = getContext("DocumentSheetObject");

   // Reference to the item
   export let id = void 0;

   // Item reference
   $: checks = $document.items.get(id).system.check;
</script>

<!--Checks-->
{#if checks.length > 0}
   <div class="checks">
      <!--Each Check-->
      {#each checks as check, checkIdx}
         <div class="check">
            <ActorItemCheck {id} {checkIdx} />
         </div>
      {/each}
   </div>
{/if}

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .checks {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .check {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
      }
   }
</style>
