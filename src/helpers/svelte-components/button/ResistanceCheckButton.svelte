<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import getBestUserTargets from "~/helpers/utility-functions/GetBestUserTargets.js";

   /** @type string The Resistance to roll. */
   export let resistance = void 0;

   /** @type string The Difficulty of the Check. */
   export let difficulty = 4;

   /** @type number The Complexity of the Check. */
   export let complexity = 1;

   /** @type number Damage to be reduced by the check, if any. */
   export let damageToReduce = 0;

   /** @type boolean The Complexity of the Check. */
   export let disabled = false;

   async function requestResistanceCheck() {
      const userTargets = getBestUserTargets();

      // For each target
      for (const target of userTargets) {
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
</script>

<div class="button {resistance}">
   <Button
      {disabled}
      on:click={() => {
         requestResistanceCheck();
      }}
      tooltip={localize(`${resistance}.desc`)}
   >
      {`${localize(resistance)} ${difficulty}:${complexity}`}
   </Button>
</div>

<style lang="scss">
   .button {
      @include flex-row;
      @include font-size-normal;
      @include resistance-button;

      width: 100%;
   }
</style>
