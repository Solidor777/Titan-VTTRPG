<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   const document = getContext("DocumentStore");

   // Chat context reference
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="traits">
   {#each chatContext.system.traits as trait}
      <div class="trait">
         {localize(`${trait.name}`)}
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
         background: var(--label-background);
      }
   }
</style>
