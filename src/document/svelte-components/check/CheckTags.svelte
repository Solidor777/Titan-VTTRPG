<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';
   import ResistedByTag from '~/helpers/svelte-components/tag/ResistedByTag.svelte';
   import OpposedCheckTag from '~/helpers/svelte-components/tag/OpposedCheckTag.svelte';
   import { SPEND_RESOLVE_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} CheckTagsProps
    * @property {number} [idx] - The index of the check in the current document's `system.check` array.
    * @property {string} [attribute] - Optional actor-resolved attribute overriding the config attribute. Pass
    *    `checkParameters.attribute` from actor-context consumers; omit on top-level document sheets.
    * @property {boolean} [hideBasics] - Skips the attribute/skill/DC tag for consumers whose header
    *    already shows those basics (the sidebar check panels).
    */

   /** @type {CheckTagsProps} */
   const { idx = undefined, attribute = undefined, hideBasics = false } = $props();

   /** @type {object} The nearest document bridge (item, effect, or embedded document via a provider). */
   const document = getContext('document');

   /** @type {object|undefined} The current check config, re-read reactively through the document bridge. */
   const check = $derived(document.data?.system?.check?.[idx]);
</script>

{#if check}
   <div class="check-tags">
      <!--Attribute, Skill, Difficulty, and Complexity-->
      {#if !hideBasics}
         <div class="stat">
            <AttributeCheckTag
               attribute={attribute ?? check.attribute}
               complexity={check.complexity}
               difficulty={check.difficulty}
               skill={check.skill}
               testId={'check-tags-attribute'}
            />
         </div>
      {/if}

      <!--Resolve Cost-->
      {#if check.resolveCost > 0}
         <div class="stat">
            <IconStatTag
               icon={SPEND_RESOLVE_ICON}
               label={localize('resolveCost')}
               testId={'check-tags-resolve-cost'}
               value={check.resolveCost}
            />
         </div>
      {/if}

      <!--Resistance Check-->
      {#if check.resistanceCheck !== 'none'}
         <div class="stat">
            <ResistedByTag
               resistance={check.resistanceCheck}
               testId={'check-tags-resisted-by'}
            />
         </div>
      {/if}

      <!--Opposed Check-->
      {#if check.opposedCheck.enabled}
         <div class="stat">
            <OpposedCheckTag
               attribute={check.opposedCheck.attribute}
               skill={check.opposedCheck.skill}
               testId={'check-tags-opposed'}
            />
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   .check-tags {
      @include flex-row;
      @include flex-group-center;
      @include font-size-small;

      flex-wrap: wrap;

      .stat {
         @include tag-container-child-margin;
      }
   }
</style>
