<script>
   import {getContext} from 'svelte';
   import {slide} from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {ATTACK_TRAIT_DESCRIPTIONS} from '~/document/types/item/types/weapon/AttackTraits.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import {COLLAPSED_ICON, DAMAGE_ICON, EXPANDED_ICON, MELEE_ICON, RANGE_ICON} from '~/system/Icons.js';

   // Setup context variables
   const document = getContext('document');
   const appState = getContext('applicationState');
   const traitDescriptions = ATTACK_TRAIT_DESCRIPTIONS;

   // Initialize expanded state
   $document.system.attack.forEach((entry, idx) => {
      $appState.isExpanded.sidebar.attack[idx] =
         $appState.isExpanded.sidebar.attack[idx] ?? true;
   });
</script>

<ol>
   {#each $document.system.attack as attack, idx (attack.uuid)}
      <li transition:slide|local>
         <!--Label-->
         <div class="header">
            <div class="spacer"/>

            <!--Label-->
            <div class="label">
               <!--Icon-->
               <i class="{attack.type === 'melee' ? MELEE_ICON : RANGE_ICON}"/>
               <!-- Text-->
               <div class="text">
                  {attack.label}
               </div>
            </div>

            <!--Expand Toggle-->
            <div class="spacer">
               {#if $appState.isExpanded.sidebar.attack[idx]}
                  <!--Collapse button-->
                  <IconButton
                     icon="{EXPANDED_ICON}"
                     on:click={() => {
                        $appState.isExpanded.sidebar.attack[idx] = false;
                     }}
                  />
               {:else}
                  <!--Expand button-->
                  <IconButton
                     icon="{COLLAPSED_ICON}"
                     on:click={() => {
                        $appState.isExpanded.sidebar.attack[idx] = true;
                     }}
                  />
               {/if}
            </div>
         </div>

         {#if $appState.isExpanded.sidebar.attack[idx]}
            <div class="stats" transition:slide|local>
               <!--Attack Type-->
               <div class="stat">
                  <Tag label={localize(attack.type)}/>
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
                  <AttributeTag
                     attribute={attack.attribute}
                     label={`${localize(attack.attribute)} (${localize(
                        attack.skill,
                     )})`}
                  />
               </div>

               <!--Normal Traits-->
               {#each attack.trait as trait (trait.name)}
                  <div
                     class="stat"
                     use:tooltipAction="{localize(traitDescriptions[trait.name])}"
                     transition:slide|local
                  >
                     {#if typeof (trait.value) === 'number'}
                        <!--Number Trait-->
                        <StatTag
                           label={localize(trait.name)}
                           value={trait.value}
                        />
                     {:else}
                        <!--Bool Trait-->
                        <Tag label={localize(trait.name)}/>
                     {/if}
                  </div>
               {/each}

               <!--Custom Traits-->
               {#each attack.customTrait as trait (trait.uuid)}
                  <div
                     class="stat"
                     use:tooltipAction="{trait.description}"
                     transition:slide|local
                  >
                     <Tag label={trait.name}/>
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

            margin-top: var(--titan-padding-large);
         }

         .header {
            @include flex-row;
            @include flex-space-between;
            @include border-bottom;
            @include panel-1;

            font-weight: bold;
            width: 100%;
            padding: var(--titan-padding-standard);

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

                  margin-right: var(--titan-padding-standard);
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

            width: calc(100% - var(--titan-padding-large));
            flex-wrap: wrap;
            padding: 0 var(--titan-padding-standard) var(--titan-padding-large) var(--titan-padding-standard);

            .stat {
               margin: var(--titan-padding-large) var(--titan-padding-standard) 0 var(--titan-padding-standard);
            }
         }
      }
   }
</style>
