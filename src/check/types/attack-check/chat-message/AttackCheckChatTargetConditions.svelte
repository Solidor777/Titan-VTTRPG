<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import { getTargetConditionModifierLabel } from '~/check/types/attack-check/TargetConditionModifiers.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div
   class="target-conditions"
   data-testid="check-chat-target-conditions"
>
   <!--Label-->
   <div class="label">{localize('targetConditions')}</div>

   <!--Applied modifiers, localized on this client-->
   {#each document.data.system.parameters.targetConditions as modifier (`${modifier.condition}.${modifier.modifier}`)}
      <div class="stat">
         <Tag testId={'check-chat-target-condition'}>
            {getTargetConditionModifierLabel(modifier)}
         </Tag>
      </div>
   {/each}
</div>

<style lang="scss">
   .target-conditions {
      @include flex-row;
      @include flex-group-center;

      width: 100%;
      flex-wrap: wrap;

      .label {
         font-weight: bold;
      }

      .stat {
         @include tag-container-child-margin;
      }
   }
</style>
