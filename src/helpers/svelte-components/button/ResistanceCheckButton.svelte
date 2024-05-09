<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   // Resistance to roll
   export let resistance = 'reflexes';
   export let difficulty = 4;
   export let complexity = 1;
   export let damageToReduce = 0;
   export let disabled = false;

   async function requestResistanceCheck() {
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
         if (target && target.system.resistance) {
            // Roll a Resistance Check
            await target.system.requestResistanceCheck(
               {
                  resistance: resistance,
                  difficulty: difficulty,
                  complexity: complexity,
                  damageToReduce: damageToReduce,
               },
            );
         }
      }
   }
</script>

<div class="button {resistance}">
   <Button
      on:click={() => {
         requestResistanceCheck();
      }}
      {disabled}
   >
      {`${localize(resistance)} ${difficulty}:${complexity}`}
   </Button>
</div>

<style lang="scss">
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
