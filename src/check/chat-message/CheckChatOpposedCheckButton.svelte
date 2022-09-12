<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";
   const document = getContext("DocumentSheetObject");

   async function rollOpposedCheck(options) {
      // Get the targets
      let userTargets = game.user.isGM ? Array.from(game.user.targets) : Array.from(canvas.tokens.ownedTokens);
      if (userTargets.length <= 0 && game.user.isGM) {
         userTargets = Array.from(canvas.tokens.controlled);
      }

      // For each target
      for (let idx = 0; idx < userTargets.length; idx++) {
         // If the target is valid
         const target = userTargets[idx]?.actor;
         if (target) {
            // Roll a resistance check
            await target.rollAttributeCheck(options);
         }
      }

      return;
   }

   // Options reference
   $: options = $document.flags.titan.chatContext.parameters.opposedCheck;
</script>

<!--Apply healing button-->
<div class="opposed-check-button {options.attribute}">
   <EfxButton
      on:click={() => {
         rollOpposedCheck(options);
      }}
   >
      {#if options.skill && options.skill !== "none"}
         {`${localize(`LOCAL.${options.attribute}.label`)} (${localize(`LOCAL.${options.skill}.label`)}) ${
            options.difficulty
         }:${options.complexity}`}
      {:else}
         {`${localize(`LOCAL.${options.attribute}.label`)} ${options.difficulty}:${options.complexity}`}
      {/if}
   </EfxButton>
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .opposed-check-button {
      @include flex-row;
      width: 100%;
      --button-border-radius: 10px;
      font-size: 1rem;

      &.body {
         --button-background-color: var(--body-color-bright);
      }

      &.mind {
         --button-background-color: var(--mind-color-bright);
      }

      &.soul {
         --button-background-color: var(--soul-color-bright);
      }
   }
</style>
