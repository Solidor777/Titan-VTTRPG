<script>
   import { localize } from "~/helpers/Utility.js";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";

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
         if (target && target.system.attribute) {
            // Roll a resistance check
            await target.typeComponent.rollAttributeCheck(options);
         }
      }

      return;
   }

   // Check Options reference
   export let opposedCheck = void 0;
</script>

<!--Apply healing button-->
<div class="opposed-check-button {opposedCheck.attribute}">
   <EfxButton
      on:click={() => {
         rollOpposedCheck(opposedCheck);
      }}
   >
      {#if opposedCheck.skill && opposedCheck.skill !== "none"}
         {`${localize(`${opposedCheck.attribute}`)} (${localize(`${opposedCheck.skill}`)}) ${opposedCheck.difficulty}:${
            opposedCheck.complexity
         }`}
      {:else}
         {`${localize(`${opposedCheck.attribute}`)} ${opposedCheck.difficulty}:${opposedCheck.complexity}`}
      {/if}
   </EfxButton>
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .opposed-check-button {
      @include flex-row;
      width: 100%;
      --button-border-radius: 10px;
      @include font-size-normal;

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
