<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   const document = getContext("DocumentSheetObject");

   // Chat context reference
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="stats">
   <div class="stat">
      {localize(`LOCAL.armor.label`)}: {chatContext.system.armor}
   </div>

   {#each chatContext.system.traits as trait}
      <div class="stat">
         {localize(`LOCAL.${trait.name}.label`)}
         {#if trait.type === "number"}
            {trait.value}
         {/if}
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../../../styles/mixins.scss";
   .stats {
      @include flex-row;
      @include flex-group-center;
      width: 100%;
      flex-wrap: wrap;
      font-weight: bold;

      .stat {
         @include flex-row;
         @include flex-group-center;
         @include border;
         margin: 0.25rem;
         padding: 0.25rem;
         background: var(--label-background-color);
      }
   }
</style>
