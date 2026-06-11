<script>
   import getBestCharactersToUpdate from '~/helpers/utility-functions/GetBestCharactersToUpdate.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} ChatMessageOpposedAttributeCheckButtonProps
    * @property {string} [attribute] The Attribute to use for the opposed check.
    * @property {string} [skill] The Skill to use for the opposed check.
    * @property {number} [difficulty] The Difficulty of the opposed check.
    * @property {number} [complexity] The Complexity of the opposed check.
    * @property {number} [damageToReduce] Damage to be reduced by the check, if any.
    */

   /** @type {ChatMessageOpposedAttributeCheckButtonProps} */
   const {
      attribute = 'body',
      skill = 'arcana',
      difficulty = 4,
      complexity = 1,
      damageToReduce = 0,
   } = $props();

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

   }
</style>
