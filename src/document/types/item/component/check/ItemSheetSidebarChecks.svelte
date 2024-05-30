<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {slide} from 'svelte/transition';
   import ResistanceTag from '~/helpers/svelte-components/tag/ResistanceTag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import {COLLAPSED_ICON, DICE_ICON, EXPANDED_ICON} from '~/system/Icons.js';

   // Document reference
   const document = getContext('document');
   const appState = getContext('applicationState');

   // Initialize expanded state
   $document.system.check.forEach((entry, idx) => {
      $appState.isExpanded.sidebar.check[idx] =
         $appState.isExpanded.sidebar.check[idx] ?? true;
   });
</script>

<ol>
   {#each $document.system.check as check, idx (check.uuid)}
      <li transition:slide|local>
         <!--Header-->
         <div class="header {check.attribute}">
            <!--Label-->
            <div class="label">
               <div class="spacer"/>

               <div class="main-label">
                  <!--Icon-->
                  <i class="{DICE_ICON}"/>

                  <!--Text-->
                  <div class="text">
                     {check.label}
                  </div>
               </div>

               <div class="spacer">
                  {#if check.resolveCost > 0 || check.resistanceCheck !== 'none' || check.opposedCheck.enabled === true}
                     {#if $appState.isExpanded.sidebar.check[idx]}
                        <!--Collapse button-->
                        <IconButton
                           icon="{EXPANDED_ICON}"
                           on:click={() => {
                              $appState.isExpanded.sidebar.check[idx] = false;
                           }}
                        />
                     {:else}
                        <!--Expand button-->
                        <IconButton
                           icon="{COLLAPSED_ICON}"
                           on:click={() => {
                              $appState.isExpanded.sidebar.check[idx] = true;
                           }}
                        />
                     {/if}
                  {/if}
               </div>
            </div>

            <!--Value-->
            <div class="value">
               {#if check.skill !== 'none'}
                  {`${localize(check.attribute)} (${localize(check.skill)}) ${
                     check.difficulty
                  }:${check.complexity}`}
               {:else}
                  {`${localize(check.attribute)} ${check.difficulty}:${
                     check.complexity
                  }`}
               {/if}
            </div>
         </div>

         {#if $appState.isExpanded.sidebar.check[idx] && (check.resolveCost > 0 || check.resistanceCheck !== 'none' || check.opposedCheck.enabled === true)}
            <div class="stats" transition:slide|local>
               <!--Resolve Cost-->
               {#if check.resolveCost > 0}
                  <div class="stat" transition:slide|local>
                     <StatTag
                        label={localize('resolveCost')}
                        value={check.resolveCost}
                     />
                  </div>
               {/if}

               <!--Resistance Check-->
               {#if check.resistanceCheck !== 'none'}
                  <div class="labeled-stat" transition:slide|local>
                     <!--Label-->
                     <div class="label">
                        {localize('resistedBy')}
                     </div>

                     <!--Value-->
                     <div class="value">
                        <ResistanceTag
                           resistance={check.resistanceCheck}
                           label={localize(check.resistanceCheck)}
                        />
                     </div>
                  </div>
               {/if}

               <!--Opposed Check-->
               {#if check.opposedCheck.enabled === true}
                  <div class="labeled-stat" transition:slide|local>
                     <!--Label-->
                     <div class="label">
                        {localize('opposedBy')}
                     </div>

                     <!--Value-->
                     <div
                        class="value attribute {check.opposedCheck.attribute}"
                     >
                        {#if check.opposedCheck.skill !== 'none'}
                           <AttributeTag
                              label={`${localize(
                                 check.opposedCheck.attribute,
                              )} (${localize(check.opposedCheck.skill)})`}
                              attribute={check.opposedCheck.attribute}
                           />
                        {:else}
                           <AttributeTag
                              label={localize(check.opposedCheck.attribute)}
                              attribute={check.opposedCheck.attribute}
                           />
                           {localize(check.opposedCheck.attribute)}
                        {/if}
                     </div>
                  </div>
               {/if}
            </div>
         {/if}
      </li>
   {/each}
</ol>

<style lang="scss">
   ol {
      @include flex-column;
      @include flex-group-top;
      @include list;

      width: 100%;

      li {
         @include flex-column;
         @include flex-group-top;

         width: 100%;
         margin-left: var(--titan-padding-standard);
         margin-top: var(--titan-padding-large);

         --titan-border-color: var(--titan-button-border-color);

         .header {
            @include flex-column;
            @include flex-group-top;
            @include border;
            @include attribute-colors;
            @include label;

            width: 100%;
            padding: var(--titan-padding-standard);

            .label {
               @include flex-row;
               @include flex-group-center;

               width: 100%;

               .main-label {
                  @include flex-row;
                  @include flex-group-center;

                  width: 100%;

                  .text {
                     @include flex-row;
                     @include flex-group-center;

                     font-weight: bold;
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

            .value {
               margin-top: var(--titan-padding-standard);
            }
         }

         .stats {
            @include flex-row;
            @include flex-group-center;
            @include border-bottom-sides;
            @include panel-3;

            width: calc(100% - var(--titan-padding-large));
            flex-wrap: wrap;
            padding: 0 var(--titan-padding-large) var(--titan-padding-large) var(--titan-padding-large);

            .stat {
               @include flex-row;
               @include flex-group-center;

               margin-top: var(--titan-padding-large);
            }

            .labeled-stat {
               @include flex-column;
               @include flex-group-top;

               margin-top: var(--titan-padding-large);

               .label {
                  @include flex-row;
                  @include flex-group-center;
                  @include font-size-small;

                  font-weight: bold;
               }

               .value {
                  @include flex-row;
                  @include flex-group-center;

                  margin-top: var(--titan-padding-standard);
               }
            }
         }
      }
   }
</style>
