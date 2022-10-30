<script>
   import { localize } from "~/helpers/Utility.js";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";

   // Resistance to roll
   export let resistance = "reflexes";
   export let difficulty = 4;
   export let complexity = 1;

   export let disabled = false;

   async function rollResistanceCheck() {
      // Get the targets
      let userTargets = game.user.isGM ? Array.from(game.user.targets) : Array.from(canvas.tokens.ownedTokens);
      if (userTargets.length <= 0 && game.user.isGM) {
         userTargets = Array.from(canvas.tokens.controlled);
      }

      // For each target
      for (let idx = 0; idx < userTargets.length; idx++) {
         // If the target is valid
         const target = userTargets[idx]?.actor;
         if (target && target.system.resistance) {
            // Roll a resistance check
            await target.typeComponent.rollResistanceCheck({
               resistance: resistance,
               difficulty: difficulty,
               complexity: complexity,
            });
         }
      }

      return;
   }
</script>

<div class="button {resistance}">
   <EfxButton
      on:click={() => {
         rollResistanceCheck();
      }}
      {disabled}
   >
      {`${localize(`${resistance}`)} ${difficulty}:${complexity}`}
   </EfxButton>
</div>

<style lang="scss">
   @import "../../../styles/Mixins.scss";

   .button {
      @include flex-row;
      width: 100%;
      @include font-size-normal;

      &.reflexes {
         --button-background: var(--reflexes-color);
      }

      &.resilience {
         --button-background: var(--resilience-color);
      }

      &.willpower {
         --button-background: var(--willpower-color);
      }
   }
</style>
