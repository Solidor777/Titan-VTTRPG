<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   const document = getContext("DocumentSheetObject");

   // Chat context reference
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="footer">
   {#if chatContext.system.value !== null}
      <div class="stat">
         {localize("LOCAL.value.label")}:
         {chatContext.system.value}
      </div>
   {/if}

   {#if chatContext.system.rarity !== null}
      <div class="stat {chatContext.system.rarity}">
         {localize(`LOCAL.${chatContext.system.rarity}.label`)}
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";
   .footer {
      @include flex-row;
      @include flex-space-evenly;
      @include border-top;
      width: 100%;
      padding: 0.5rem;
      font-size: 0.9rem;

      .stat {
         @include flex-row;
         @include flex-group-center;
         @include border;
         font-weight: bold;
         padding: 0.25rem;
         background: var(--label-background-color);
         margin-left: 0.5rem;

         &.uncommon {
            background-color: var(--uncommon-color-bright);
         }

         &.rare {
            background-color: var(--rare-color-bright);
         }

         &.unique {
            background-color: var(--unique-color-bright);
         }
      }
   }
</style>
