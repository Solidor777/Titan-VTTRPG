<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';

   // Reference to the weapon id
   export let item = void 0;

   // Context references
   const document = getContext('DocumentStore');
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
         value={$document.system.attribute[item.system.castingCheck.attribute]
            .value +
            $document.system.skill[item.system.castingCheck.skill].training
               .value +
            $document.typeComponent.getCastingCheckDiceMod(item)}
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
   {#if $document.system.skill[item.system.castingCheck.skill].expertise.value !== 0}
      <div class="tag">
         <IconStatTag
            label={localize('expertise')}
            value={$document.system.skill[item.system.castingCheck.skill]
               .expertise.value}
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
