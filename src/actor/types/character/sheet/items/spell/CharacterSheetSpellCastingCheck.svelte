<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';

   // Reference to the weapon id
   export let item = void 0;

   // Context references
   const document = getContext('DocumentStore');

   // Calculate dice pool
   let dicePool = 0;
   $: {
      dicePool =
         $document.system.attribute[item.system.castingCheck.attribute].value +
         $document.system.skill[item.system.castingCheck.skill].training.value +
         $document.typeComponent.getCastingCheckDiceMod(item);
   }

   // Calculate expertise
   let expertise = 0;
   $: {
      expertise =
         $document.system.skill[item.system.castingCheck.skill].expertise
            .value + $document.typeComponent.getCastingCheckExpertiseMod(item);
   }
</script>

<div class="check">
   <div class="tag">
      <AttributeTag
         attribute={item.system.castingCheck.attribute}
         label={`${localize(item.system.castingCheck.attribute)} (${localize(
            item.system.castingCheck.skill
         )}) ${item.system.castingCheck.difficulty}:${
            item.system.castingCheck.complexity
         }`}
      />
   </div>

   <!--Dice-->
   <div class="tag">
      <IconStatTag
         label={localize('dice')}
         value={dicePool}
         icon={'fas fa-dice-d6'}
      />
   </div>

   <!--Training-->
   {#if $document.system.skill[item.system.castingCheck.skill].training.value !== 0}
      <div class="tag">
         <IconStatTag
            label={localize('training')}
            value={$document.system.skill[item.system.castingCheck.skill]
               .training.value}
            icon={'fas fa-dumbbell'}
         />
      </div>
   {/if}

   <!--Expertise-->
   {#if expertise !== 0}
      <div class="tag">
         <IconStatTag
            label={localize('expertise')}
            value={expertise}
            icon={'fas fa-graduation-cap'}
         />
      </div>
   {/if}
</div>

<style lang="scss">
   @import '../../../../../../Styles/Mixins.scss';

   .check {
      @include flex-row;
      @include flex-space-evenly;
      @include font-size-small;
      flex-wrap: wrap;

      .tag {
         @include tag-margin;
      }
   }
</style>
