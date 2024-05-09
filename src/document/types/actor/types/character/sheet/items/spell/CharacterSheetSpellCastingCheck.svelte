<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import { DICE_ICON, EXPERTISE_ICON, TRAINING_ICON } from '~/system/Icons.js';

   // Reference to the weapon id
   export let item = void 0;

   // Context references
   const document = getContext('document');

   // Calculate dice pool
   let dicePool = 0;
   $: {
      dicePool =
         $document.system.attribute[item.system.castingCheck.attribute].value +
         $document.system.skill[item.system.castingCheck.skill].training.value +
         $document.system.getCastingCheckMod('dice', item);
   }

   // Calculate expertise
   let expertise = 0;
   $: {
      expertise =
         $document.system.skill[item.system.castingCheck.skill].expertise
            .value +
         $document.system.getCastingCheckMod('expertise', item);
   }
</script>

<div class="check">
   <div class="tag">
      <AttributeTag
         attribute={item.system.castingCheck.attribute}
         label={`${localize(item.system.castingCheck.attribute)} (${localize(
            item.system.castingCheck.skill,
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
         icon={DICE_ICON}
      />
   </div>

   <!--Training-->
   {#if $document.system.skill[item.system.castingCheck.skill].training.value !== 0}
      <div class="tag">
         <IconStatTag
            label={localize('training')}
            value={$document.system.skill[item.system.castingCheck.skill]
               .training.value}
            icon={TRAINING_ICON}
         />
      </div>
   {/if}

   <!--Expertise-->
   {#if expertise !== 0}
      <div class="tag">
         <IconStatTag
            label={localize('expertise')}
            value={expertise}
            icon={EXPERTISE_ICON}
         />
      </div>
   {/if}
</div>

<style lang="scss">
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
