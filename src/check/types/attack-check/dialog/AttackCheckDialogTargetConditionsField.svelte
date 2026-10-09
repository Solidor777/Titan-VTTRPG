<script>
   import { getContext } from 'svelte';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import { getTargetConditionModifierLabel } from '~/check/types/attack-check/TargetConditionModifiers.js';

   /** @type {import('svelte/store').Writable} Reference to the Check Parameters store. */
   const checkParameters = getContext('checkParameters');
</script>

<!--Field-->
<div
   class="field"
   data-testid="attack-target-conditions"
>

   <!--Label-->
   <div class="sign">
      <Text text={'targetConditions'}/>
   </div>

   <!--Applied modifiers-->
   <div class="value">
      {#each $checkParameters.targetConditions as modifier (`${modifier.condition}.${modifier.modifier}`)}
         <div
            class="tag"
            data-testid="attack-target-condition"
         >
            {getTargetConditionModifierLabel(modifier)}
         </div>
      {/each}
   </div>
</div>

<style lang="scss">
   .field {
      @include flex-row;
      @include flex-group-center;
      @include padding-standard;

      width: 100%;

      .sign {
         @include flex-group-right;
         @include border-right;

         width: 100%;
         font-weight: bold;

         @include padding-right-large;
      }

      .value {
         @include flex-row;
         @include flex-group-left;

         width: 100%;
         flex-wrap: wrap;

         .tag {
            @include border;
            @include tag;
            @include margin-left-large;
         }
      }
   }
</style>
