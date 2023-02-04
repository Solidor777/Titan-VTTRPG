<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import { localize } from '~/helpers/Utility.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import IconStatTag from '../../../../helpers/svelte-components/tag/IconStatTag.svelte';

   // Setup context variables
   const document = getContext('DocumentStore');
   const appState = getContext('ApplicationStateStore');

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
            <div class="spacer" />

            <!--Label-->
            <div class="label">
               <!--Icon-->
               <i
                  class="fas fa-{attack.type === 'melee'
                     ? 'sword'
                     : 'bow-arrow'}"
               />
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
                     icon="fas fa-angle-double-down"
                     on:click={() => {
                        $appState.isExpanded.sidebar.attack[idx] = false;
                     }}
                  />
               {:else}
                  <!--Expand button-->
                  <IconButton
                     icon="fas fa-angle-double-left"
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
                  <Tag label={localize(attack.type)} />
               </div>

               <!--Range-->
               {#if attack.range !== 1}
                  <div class="stat" transition:slide|local>
                     <IconStatTag
                        label={localize('range')}
                        value={attack.range}
                        icon={'fas fa-ruler'}
                     />
                  </div>
               {/if}

               <!--Damage-->
               <div class="stat">
                  <IconStatTag
                     icon={'fas fa-burst'}
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
                        attack.skill
                     )})`}
                  />
               </div>

               <!--Normal Traits-->
               {#each attack.trait as trait (trait.name)}
                  <div
                     class="stat"
                     use:tooltip={{ content: localize(`${trait.name}.desc`) }}
                     transition:slide|local
                  >
                     {#if trait.type === 'number'}
                        <!--Number Trait-->
                        <StatTag
                           label={localize(trait.name)}
                           value={trait.value}
                        />
                     {:else}
                        <!--Bool Trait-->
                        <Tag label={localize(trait.name)} />
                     {/if}
                  </div>
               {/each}

               <!--Custom Traits-->
               {#each attack.customTrait as trait (trait.uuid)}
                  <div
                     class="stat"
                     use:tooltip={{ content: trait.description }}
                     transition:slide|local
                  >
                     <Tag label={trait.name} />
                  </div>
               {/each}
            </div>
         {/if}
      </li>
   {/each}
</ol>

<style lang="scss">
   @import '../../../../Styles/Mixins.scss';
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
            margin-top: 0.5rem;
         }

         .header {
            @include flex-row;
            @include flex-space-between;
            @include border-bottom;
            @include panel-1;
            font-weight: bold;
            width: 100%;
            padding: 0.25rem;

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
                  margin-right: 0.25rem;
               }
            }

            .spacer {
               @include flex-row;
               @include flex-group-center;
               width: 3rem;
            }
         }

         .stats {
            @include flex-row;
            @include flex-group-center;
            @include border-bottom-sides;
            @include panel-3;
            @include font-size-small;
            width: calc(100% - 0.5rem);
            flex-wrap: wrap;
            padding: 0 0.25rem 0.5rem 0.25rem;

            .stat {
               margin: 0.5rem 0.25rem 0 0.25rem;
            }
         }
      }
   }
</style>
