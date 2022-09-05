<script>
   import { getContext } from "svelte";
   import CheckAspect from "./CheckAspect.svelte";
   const document = getContext("DocumentSheetObject");

   // Chat context
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="aspects">
   <!--Each aspect-->
   {#each chatContext.parameters.aspects as aspect, idx}
      <!--If Overcast-->
      {#if aspect.overcast}
         <!--Aspect-->
         <div class="aspect">
            <CheckAspect bind:aspect />
         </div>
      {/if}
   {/each}
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";
   .aspects {
      @include border;
      @include flex-column;
      @include flex-group-top;
      padding: 0.5rem;
      width: 100%;

      .aspect {
         @include flex-row;
         @include flex-group-center;
         font-size: 1rem;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            margin-top: 0.25rem;
            padding-top: 0.25rem;
         }
      }
   }
</style>
