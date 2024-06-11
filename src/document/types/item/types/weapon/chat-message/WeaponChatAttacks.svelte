<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import {ATTACK_TRAIT_DESCRIPTIONS} from '~/document/types/item/types/weapon/AttackTraits.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import IconTag from '~/helpers/svelte-components/tag/IconTag.svelte';
   import {ACCURACY_ICON, DAMAGE_ICON, MELEE_ICON, RANGE_ICON} from '~/system/Icons.js';

   export let item = void 0;
   const traitDescriptions = ATTACK_TRAIT_DESCRIPTIONS;
</script>

<ol>
   {#each Object.values(item.system.attack) as attack}
      <!--Each attack-->
      <li>
         <div class="row header">
            <!--Attack Button-->
            <div class="attack-name">
               <i class="{attack.type === 'melee'? MELEE_ICON: ACCURACY_ICON}"/>
               {attack.label}
            </div>
         </div>

         <div class="row stats">
            <!--Damage-->
            <div class="stat">
               <IconStatTag
                  icon={DAMAGE_ICON}
                  label={localize('damage')}
                  value={`${attack.damage}${
                     attack.plusExtraSuccessDamage
                        ? ` + ${localize('extraSuccesses.short')}`
                        : ''
                  }`}
               />
            </div>

            <!--Type-->
            <div class="stat">
               <IconTag
                  icon={attack.type === 'melee' ? MELEE_ICON: ACCURACY_ICON}
                  label={localize(attack.type)}
               />
            </div>

            <!--Range-->
            {#if attack.range !== 1}
               <div class="stat">
                  <IconStatTag
                     label={localize('range')}
                     value={attack.range}
                     icon={RANGE_ICON}
                  />
               </div>
            {/if}

            <!--Attribute and skill-->
            <div class="stat">
               <AttributeTag
                  attribute={attack.attribute}
                  label={`${localize(attack.attribute)} (${localize(
                     attack.skill,
                  )})`}
               />
            </div>

            <!--Traits-->
            {#each attack.trait as trait}
               <div
                  class="stat"
                  use:tooltipAction="{{
                     content: localize(traitDescriptions[trait.name]),
                  }}"
               >
                  {#if typeof (trait.value) === 'number'}
                     <StatTag
                        label={localize(trait.name)}
                        value={trait.value}
                     />
                  {:else}
                     <Tag label={localize(trait.name)}/>
                  {/if}
               </div>
            {/each}

            <!--Custom Traits-->
            {#each attack.customTrait as trait}
               <div class="stat" use:tooltipAction="{trait.description}">
                  <Tag label={trait.name}/>
               </div>
            {/each}
         </div>
      </li>
   {/each}
</ol>

<style lang="scss">
   ol {
      @include list;
      @include flex-column;
      @include flex-group-top;
      @include font-size-small;

      width: 100%;

      li {
         @include flex-column;
         @include flex-group-top;

         width: 100%;

         &:not(:first-child) {
            @include border-top;

            margin-top: var(--titan-padding-large);
            padding-top: var(--titan-padding-large);
         }

         .row {
            @include flex-row;

            width: 100%;
            flex-wrap: wrap;

            &.header {
               @include flex-group-center;
            }

            &.stats {
               @include flex-group-center;

               .stat {
                  @include tag-margin;
               }
            }

            .attack-name {
               @include font-size-normal;

               font-weight: bold;
            }
         }
      }
   }
</style>
