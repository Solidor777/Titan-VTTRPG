<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { ATTACK_TRAIT_DESCRIPTIONS } from '~/document/types/item/types/weapon/AttackTraits.js';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import {
      COLLAPSED_ICON,
      DAMAGE_ICON,
      EXPANDED_ICON,
      MELEE_ICON,
      RANGE_ICON,
   } from '~/system/Icons.js';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   const traitDescriptions = ATTACK_TRAIT_DESCRIPTIONS;
</script>

<ol>
   {#each document.data.system.attack as attack, idx (attack.uuid)}
      <li transition:slide|local>
         <!--Label-->
         <div class="header">
            <div class="spacer"></div>

            <!--Label-->
            <div class="label">
               <!--Icon-->
               <i class={attack.type === 'melee' ? MELEE_ICON : RANGE_ICON}></i>
               <!-- Text-->
               <div class="text">
                  {attack.label}
               </div>
            </div>

            <!--Expand Toggle-->
            <div class="spacer">
               {#if $appState.sidebar.attacks.isExpanded[idx]}
                  <!--Collapse button-->
                  <IconButton
                     icon={EXPANDED_ICON}
                     label={localize('collapse')}
                     onclick={() => {
                        $appState.sidebar.attacks.isExpanded[idx] = false;
                     }}
                  />
               {:else}
                  <!--Expand button-->
                  <IconButton
                     icon={COLLAPSED_ICON}
                     label={localize('expand')}
                     onclick={() => {
                        $appState.sidebar.attacks.isExpanded[idx] = true;
                     }}
                  />
               {/if}
            </div>
         </div>

         {#if $appState.sidebar.attacks.isExpanded[idx]}
            <div class="stats" transition:slide|local>
               <!--Attack Type-->
               <div class="stat">
                  <Tag>{localize(attack.type)}</Tag>
               </div>

               <!--Range-->
               {#if attack.range !== 1}
                  <div class="stat" transition:slide|local>
                     <IconStatTag
                        label={localize('range')}
                        value={attack.range}
                        icon={RANGE_ICON}
                     />
                  </div>
               {/if}

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

               <!--Skill & Attribute-->
               <div class="stat">
                  <AttributeCheckTag
                     attribute={attack.attribute}
                     skill={attack.skill}
                  />
               </div>

               <!--Normal Traits-->
               {#each attack.trait as trait (trait.name)}
                  <div class="stat" transition:slide|local>
                     {#if typeof (trait.value) === 'number'}
                        <!--Number Trait-->
                        <StatTag
                           tooltip={traitDescriptions[trait.name]}
                           label={localize(trait.name)}
                           value={trait.value}
                        />
                     {:else}
                        <!--Bool Trait-->
                        <Tag tooltip={traitDescriptions[trait.name]}>{localize(trait.name)}</Tag>
                     {/if}
                  </div>
               {/each}

               <!--Custom Traits-->
               {#each attack.customTrait as trait (trait.uuid)}
                  <div class="stat" transition:slide|local>
                     <Tag tooltip={{ text: trait.description, localize: false }}>
                        {trait.name}
                     </Tag>
                  </div>
               {/each}
            </div>
         {/if}
      </li>
   {/each}
</ol>

<style lang="scss">
   ol {
      @include list;
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      li {
         @include flex-column;
         @include flex-group-top;

         width: 100%;

         &:not(:first-child) {
            @include border-top;
            @include margin-top-large;
         }

         .header {
            @include flex-row;
            @include flex-space-between;
            @include border-bottom;
            @include panel-1;

            font-weight: bold;
            width: 100%;

            @include padding-standard;

            .label {
               @include flex-row;
               @include flex-group-center;

               width: 100%;

               .text {
                  @include flex-row;
                  @include flex-group-center;
               }

               i {
                  @include flex-row;
                  @include flex-group-center;
                  @include margin-right-standard;
               }
            }

            .spacer {
               @include flex-row;
               @include flex-group-center;

               width: 48px;
            }
         }

         .stats {
            @include flex-row;
            @include flex-group-center;
            @include border-bottom-sides;
            @include panel-3;
            @include font-size-small;

            width: calc(100% - var(--titan-spacing-large));
            flex-wrap: wrap;
            padding: 0 var(--titan-spacing-standard) var(--titan-spacing-large) var(--titan-spacing-standard);

            .stat {
               margin: var(--titan-spacing-large) var(--titan-spacing-standard) 0 var(--titan-spacing-standard);
            }
         }
      }
   }
</style>
