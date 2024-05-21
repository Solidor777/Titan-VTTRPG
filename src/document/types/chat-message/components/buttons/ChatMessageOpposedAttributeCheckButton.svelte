<script>
   import getBestUserTargets from "~/helpers/utility-functions/GetBestUserTargets.js";
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   export let attribute = 'body';
   export let skill = 'arcana';
   export let difficulty = 4;
   export let complexity = 1;
   export let damageToReduce = 0;

   async function rollOpposedCheck() {
      const targets = getBestUserTargets();
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

<!--Apply healing button-->
<div class="opposed-check-button {attribute}">
   <Button on:click={() => rollOpposedCheck()}>
      {#if skill && skill !== 'none'}
         {`${localize(attribute)}
         (${localize(`${skill}`)})
         ${difficulty}:${complexity}`}
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

      --button-border-radius: var(--button-chat-message-border-radius);

   }
</style>
