<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   const document = getContext("DocumentSheetObject");

   // Chat context reference
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="traits">
   {#each chatContext.system.traits as trait}
      <div class="trait">
         {localize(`LOCAL.${trait.name}.label`)}
         {#if trait.type === "number"}
            {trait.value}
         {/if}
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";
   .traits {
      @include flex-row;
      @include flex-group-center;
      @include border-top;
      width: 100%;
      flex-wrap: wrap;
      font-weight: bold;

      .trait {
         @include flex-row;
         @include flex-group-center;
         @include border;
         margin: 0.25rem;
         padding: 0.25rem;
         background-color: var(--label-background-color);
      }
   }
</style>
