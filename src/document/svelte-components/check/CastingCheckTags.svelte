<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';
   import {
      DICE_ICON,
      EXPERTISE_ICON,
      TRAINING_ICON,
   } from '~/system/Icons.js';

   /**
    * @typedef {object} CastingCheckTagsProps
    * @property {object} [parameters] - Optional actor-resolved casting-check parameters
    *    (getCastingCheckParameters output). Pass from actor-context consumers to render resolved
    *    values plus dice/training/expertise stats; omit on document consumers (spell sheet, chat
    *    card), which read the spell's castingCheck config through the nearest document context.
    */

   /** @type {CastingCheckTagsProps} */
   const { parameters = undefined } = $props();

   /** @type {object} The nearest document bridge (spell document or chat-message snapshot). */
   const document = getContext('document');

   /** @type {object|undefined} The casting-check display source: resolved parameters or config. */
   const castingCheck = $derived(parameters ?? document.data?.system?.castingCheck);
</script>

{#if castingCheck}
   <div class="casting-check-tags">
      <!--Attribute, Skill, Difficulty, and Complexity-->
      <div class="stat">
         <AttributeCheckTag
            attribute={castingCheck.attribute}
            complexity={castingCheck.complexity}
            difficulty={castingCheck.difficulty}
            skill={castingCheck.skill}
            testId={'casting-check-tags-attribute'}
         />
      </div>

      {#if parameters}
         <!--Dice-->
         <div class="stat">
            <IconStatTag
               icon={DICE_ICON}
               label={localize('dice')}
               testId={'casting-check-tags-dice'}
               value={parameters.totalDice}
            />
         </div>

         <!--Training-->
         {#if parameters.totalTrainingDice}
            <div class="stat">
               <IconStatTag
                  icon={TRAINING_ICON}
                  label={localize('training')}
                  testId={'casting-check-tags-training'}
                  value={parameters.totalTrainingDice}
               />
            </div>
         {/if}

         <!--Expertise-->
         {#if parameters.totalExpertise}
            <div class="stat">
               <IconStatTag
                  icon={EXPERTISE_ICON}
                  label={localize('expertise')}
                  testId={'casting-check-tags-expertise'}
                  value={parameters.totalExpertise}
               />
            </div>
         {/if}
      {/if}
   </div>
{/if}

<style lang="scss">
   .casting-check-tags {
      @include flex-row;
      @include flex-group-center;
      @include font-size-small;

      flex-wrap: wrap;

      .stat {
         @include tag-container-child-margin;
      }
   }
</style>
