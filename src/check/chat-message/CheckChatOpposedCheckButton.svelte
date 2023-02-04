<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   // Document reference
   const document = getContext('DocumentStore');

   // Check Options reference
   $: opposedCheck = {
      attribute:
         $document.flags.titan.chatContext.parameters.opposedCheck.attribute,
      skill: $document.flags.titan.chatContext.parameters.opposedCheck.skill,
      difficulty:
         $document.flags.titan.chatContext.parameters.opposedCheck.difficulty,
      complexity: $document.flags.titan.chatContext.results.extraSuccesses + 1,
   };

   async function rollOpposedCheck() {
      // Get the targets
      let userTargets = game.user.isGM
         ? Array.from(game.user.targets)
         : Array.from(canvas.tokens.ownedTokens);
      if (userTargets.length <= 0 && game.user.isGM) {
         userTargets = Array.from(canvas.tokens.controlled);
      }

      // For each target
      for (let idx = 0; idx < userTargets.length; idx++) {
         // If the target is valid
         const target = userTargets[idx]?.actor;
         if (target && target.system.attribute) {
            // Roll a resistance check
            await target.typeComponent.rollAttributeCheck(opposedCheck);
         }
      }

      return;
   }
</script>

<!--Apply healing button-->
<div class="opposed-check-button {opposedCheck.attribute}">
   <EfxButton
      on:click={() => {
         rollOpposedCheck(opposedCheck);
      }}
   >
      {#if opposedCheck.skill && opposedCheck.skill !== 'none'}
         {`${localize(opposedCheck.attribute)} (${localize(
            `${opposedCheck.skill}`
         )}) ${opposedCheck.difficulty}:${opposedCheck.complexity}`}
      {:else}
         {`${localize(opposedCheck.attribute)} ${opposedCheck.difficulty}:${
            opposedCheck.complexity
         }`}
      {/if}
   </EfxButton>
</div>

<style lang="scss">
   @import '../../styles/Mixins.scss';

   .opposed-check-button {
      @include flex-row;
      width: 100%;
      --button-border-radius: 10px;
      @include font-size-normal;

      &.body {
         --button-background: var(--body-color);
      }

      &.mind {
         --button-background: var(--mind-color);
      }

      &.soul {
         --button-background: var(--soul-color);
      }
   }
</style>
