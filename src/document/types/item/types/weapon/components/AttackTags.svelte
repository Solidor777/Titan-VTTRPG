<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { ATTACK_TRAIT_DESCRIPTIONS } from '~/document/types/item/types/weapon/AttackTraits.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import IconTag from '~/helpers/svelte-components/tag/IconTag.svelte';
   import TraitTag from '~/helpers/svelte-components/tag/TraitTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';
   import {
      ACCURACY_ICON,
      DAMAGE_ICON,
      MELEE_ICON,
      RANGE_ICON,
   } from '~/system/Icons.js';

   /**
    * @typedef {object} AttackTagsProps
    * @property {number} [idx] - The index of the attack in the current document's `system.attack` array.
    * @property {number} [damageMod] - Optional actor-derived modifier added to the displayed damage.
    */

   /** @type {AttackTagsProps} */
   const { idx = undefined, damageMod = 0 } = $props();

   /** @type {object} The nearest document bridge (weapon, embedded weapon, or chat-message snapshot). */
   const document = getContext('document');

   /** @type {object|undefined} The current attack data, re-read reactively through the document bridge. */
   const attack = $derived(document.data?.system?.attack?.[idx]);

   /** @type {Record<string, string>} Map of attack trait names to their description strings. */
   const traitDescriptions = ATTACK_TRAIT_DESCRIPTIONS;
</script>

{#if attack}
   <div class="attack-tags">
      <!--Damage-->
      <div class="stat">
         <IconStatTag
            icon={DAMAGE_ICON}
            label={localize('damage')}
            testId={'attack-tags-damage'}
            value={`${attack.damage + damageMod}${
               attack.plusExtraSuccessDamage ? ` + ${localize('extraSuccesses.short')}` : ''
            }`}
         />
      </div>

      <!--Type-->
      <div class="stat">
         <IconTag
            icon={attack.type === 'melee' ? MELEE_ICON : ACCURACY_ICON}
            label={localize(attack.type)}
            testId={'attack-tags-type'}
         />
      </div>

      <!--Range-->
      {#if attack.range !== 1}
         <div class="stat">
            <IconStatTag
               icon={RANGE_ICON}
               label={localize('range')}
               testId={'attack-tags-range'}
               value={attack.range}
            />
         </div>
      {/if}

      <!--Attribute and Skill-->
      <div class="stat">
         <AttributeCheckTag
            attribute={attack.attribute}
            skill={attack.skill}
            testId={'attack-tags-attribute'}
         />
      </div>

      <!--Traits-->
      {#each attack.trait as trait (trait.name)}
         <div class="stat">
            <TraitTag
               label={localize(trait.name)}
               tooltip={traitDescriptions[trait.name]}
               value={trait.value}
            />
         </div>
      {/each}

      <!--Custom Traits-->
      {#each attack.customTrait as trait (trait.uuid)}
         <div class="stat">
            <Tag tooltip={{ text: trait.description, localize: false }}>
               {trait.name}
            </Tag>
         </div>
      {/each}
   </div>
{/if}

<style lang="scss">
   .attack-tags {
      @include flex-row;
      @include flex-group-center;
      @include font-size-small;

      width: 100%;
      flex-wrap: wrap;

      .stat {
         @include tag-container-child-margin;
      }
   }
</style>
