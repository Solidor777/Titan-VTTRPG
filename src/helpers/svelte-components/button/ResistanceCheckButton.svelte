<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import getBestCharactersToUpdate from '~/helpers/utility-functions/GetBestCharactersToUpdate.js';

   /**
    * @typedef {object} ResistanceCheckButtonProps
    * @property {string} [resistance] - The Resistance to roll.
    * @property {number} [difficulty] - The Difficulty of the Check.
    * @property {number} [complexity] - The Complexity of the Check.
    * @property {number} [damageToReduce] - Damage to be reduced by the check, if any.
    * @property {boolean} [disabled] - Whether the button should be disabled.
    * @property {string | undefined} [testId] - Optional stable selector applied as `data-testid` on the wrapper div.
    */

   /** @type {ResistanceCheckButtonProps} */
   const {
      resistance = void 0,
      difficulty = 4,
      complexity = 1,
      damageToReduce = 0,
      disabled = false,
      testId = void 0,
   } = $props();

   /**
    * Requests a resistance check from each user target.
    */
   async function requestResistanceCheck() {
      const userTargets = getBestCharactersToUpdate();

      // For each target.
      for (const target of userTargets) {

         // Roll a Resistance Check.
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

<div class="button {resistance}" data-testid={testId}>
   <Button
      {disabled}
      onclick={() => requestResistanceCheck()}
      tooltip={`${resistance}.desc`}
   >
      {`${localize(resistance)} ${difficulty}:${complexity}`}
   </Button>
</div>

<style lang="scss">
   .button {
      @include flex-row;
      @include resistance-button;

      width: 100%;
   }
</style>
