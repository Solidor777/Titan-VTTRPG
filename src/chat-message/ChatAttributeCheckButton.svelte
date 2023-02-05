<script>
   import { localize, getCombatTargets } from '~/helpers/Utility.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   export let attribute = 'body';
   export let skill = 'arcana';
   export let difficulty = 4;
   export let complexity = 1;

   async function rollOpposedCheck() {
      const targets = getCombatTargets();
      targets.forEach((target) =>
         target.typeComponent.rollAttributeCheck({
            attribute: attribute,
            skill: skill,
            difficulty: difficulty,
            complexity: complexity,
         })
      );

      return;
   }
</script>

<!--Apply healing button-->
<div class="opposed-check-button {attribute}">
   <EfxButton on:click={() => rollOpposedCheck()}>
      {#if skill && skill !== 'none'}
         {`${localize(attribute)} 
         (${localize(`${skill}`)}) 
         ${difficulty}:${complexity}`}
      {:else}
         {`${localize(attribute)} ${difficulty}:${complexity}`}
      {/if}
   </EfxButton>
</div>

<style lang="scss">
   @import '../styles/Mixins.scss';

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
