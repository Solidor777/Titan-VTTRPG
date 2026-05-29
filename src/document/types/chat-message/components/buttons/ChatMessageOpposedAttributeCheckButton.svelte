<script>
   import getBestCharactersToUpdate from '~/helpers/utility-functions/GetBestCharactersToUpdate.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type {string} The Attribute to use for the opposed check. */
   export let attribute = 'body';

   /** @type {string} The Skill to use for the opposed check. */
   export let skill = 'arcana';

   /** @type {number} The Difficulty of the opposed check. */
   export let difficulty = 4;

   /** @type {number} The Complexity of the opposed check. */
   export let complexity = 1;

   /** @type {number} Damage to be reduced by the check, if any. */
   export let damageToReduce = 0;

   /**
    * Rolls opposed Attribute Checks for all targeted characters.
    */
   async function rollOpposedCheck() {
      const targets = getBestCharactersToUpdate();
      for (const target of targets) {
         target.system.requestAttributeCheck(
            {
               attribute: attribute,
               skill: skill,
               difficulty: difficulty,
               complexity: complexity,
               damageToReduce: damageToReduce,
            });
      }
   }
</script>

<!--Opposed check button-->
<div class="opposed-check-button {attribute}">
   <Button onclick={() => rollOpposedCheck()}>
      {#if skill && skill !== 'none'}
         {`${localize(attribute)} (${localize(skill)}) ${difficulty}:${complexity}`}
      {:else}
         {`${localize(attribute)} ${difficulty}:${complexity}`}
      {/if}
   </Button>
</div>

<style lang="scss">
   .opposed-check-button {
      @include flex-row;
      @include font-size-normal;
      @include attribute-colors;

      width: 100%;

      --titan-button-border-radius: var(--titan-button-border-radius);

   }
</style>
