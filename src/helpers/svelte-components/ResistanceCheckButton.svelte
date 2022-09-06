<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // Resistance to roll
   export let resistance = "reflexes";

   async function rollResistanceCheck() {
      // Get the targets
      let userTargets = game.user.isGM ? Array.from(game.user.targets) : Array.from(canvas.tokens.ownedTokens);
      if (game.user.isGM) {
         if (!userTargets.length > 0) {
            userTargets = Array.from(canvas.tokens.controlled);
         }
      } else if (userTargets.length > 0) {
         userTargets = [userTargets[0]];
      }

      // For each target
      for (let idx = 0; idx < userTargets.length; idx++) {
         // If the target is valid
         const target = userTargets[idx]?.actor;
         if (target) {
            // Roll a resistance check
            await target.rollResistanceCheck({ resistance: resistance });
         }
      }

      return;
   }
</script>

<div class="button {resistance}">
   <EfxButton
      efx={ripple}
      on:click={() => {
         rollResistanceCheck();
      }}
   >
      {localize(`LOCAL.${resistance}.label`)}
   </EfxButton>
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .button {
      @include flex-row;
      width: 100%;
      font-size: 1rem;

      &.reflexes {
         --button-background-color: var(--reflexes-color-bright);
      }

      &.resilience {
         --button-background-color: var(--resilience-color-bright);
      }

      &.willpower {
         --button-background-color: var(--willpower-color-bright);
      }
   }
</style>
