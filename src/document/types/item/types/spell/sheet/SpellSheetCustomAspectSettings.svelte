<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { slide } from 'svelte/transition';
   import DocumentCheckboxInput from '~/document/svelte-components/input/DocumentCheckboxInput.svelte';
   import DocumentResistanceSelect from '~/document/svelte-components/select/DocumentResistanceSelect.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import {
      COLLAPSED_ICON,
      DAMAGE_ICON,
      DELETE_ICON,
      EXPANDED_ICON,
      HEALING_ICON,
   } from '~/system/Icons.js';

   /**
    * @typedef {object} SpellSheetCustomAspectSettingsProps
    * @property {number} [idx] Index of the custom aspect being represented.
    */

   /** @type {SpellSheetCustomAspectSettingsProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {object} The custom aspect data. */
   const aspect = $derived(document.data.system.customAspect[idx]);

   /** @type {boolean} Whether this component is currently expanded. */
   const isExpanded = $derived($appState.tabs.customAspects.isExpanded[idx]);
</script>

{#if aspect}
   <div class="aspect" transition:slide|local>
      <!--Header-->
      <div class="header">
         <!--Expand Toggle-->
         <div>
            {#if isExpanded}
               <!--Collapse button-->
               <IconButton
                  icon={EXPANDED_ICON}
                  label={localize('collapse')}
                  onclick={() => {
                     $appState.tabs.customAspects.isExpanded[idx] = false;
                  }}
               />
            {:else}
               <!--Expand button-->
               <IconButton
                  icon={COLLAPSED_ICON}
                  label={localize('expand')}
                  onclick={() => {
                     $appState.tabs.customAspects.isExpanded[idx] = true;
                  }}
               />
            {/if}
         </div>

         <!--Label-->
         <div class="label">
            <DocumentTextInput bind:value={aspect.label}/>
         </div>

         <!--Delete button-->
         <div class="delete-button">
            <!--Delete button-->
            <IconButton
               icon={DELETE_ICON}
               label={localize('delete')}
               onclick={() => {
                  document.data.system.removeCustomAspect(idx);
               }}
            />
         </div>
      </div>

      <!--Expandable Content-->
      {#if isExpanded}
         <div class="expandable-content" transition:slide|local>
            <div class="row">
               <!--Cost-->
               <div class="field">
                  <!--Label-->
                  <div class="label">{localize('cost')}</div>

                  <!--Input-->
                  <div class="input number">
                     <DocumentIntegerInput bind:value={aspect.cost} min={0}/>
                  </div>
               </div>

               <!--Resistance Check-->
               <div class="field">
                  <!--Label-->
                  <div class="label">{localize('resistanceCheck')}</div>

                  <!--Input-->
                  <div class="input">
                     <DocumentResistanceSelect
                        bind:value={aspect.resistanceCheck}
                        allowNone={true}
                     />
                  </div>
               </div>
            </div>

            <div class="row">
               <!--Damage-->
               <div class="field">
                  <!--Icon-->
                  <i class={DAMAGE_ICON}></i>

                  <!--Label-->
                  <div class="label">{localize('damage')}</div>

                  <!--Input-->
                  <div class="input checkbox">
                     <DocumentCheckboxInput bind:value={aspect.isDamage}/>
                  </div>
               </div>

               <!--Healing-->
               <div class="field">
                  <!--Icon-->
                  <i class={HEALING_ICON}></i>

                  <!--Label-->
                  <div class="label">{localize('healing')}</div>

                  <!--Input-->
                  <div class="input checkbox">
                     <DocumentCheckboxInput bind:value={aspect.isHealing}/>
                  </div>
               </div>
            </div>

            <div class="row">
               <!--Scaling-->
               <div class="field">
                  <!--Label-->
                  <div class="label">{localize('scaling')}</div>

                  <!--Input-->
                  <div class="input checkbox">
                     <DocumentCheckboxInput bind:value={aspect.scaling}/>
                  </div>
               </div>

               <!--Initial Value-->
               <div class="field">
                  <!--Label-->
                  <div class="label">{localize('initialValue')}</div>

                  <!--Input-->
                  <div class="input number">
                     <DocumentIntegerInput
                        bind:value={aspect.initialValue}
                        min={0}
                     />
                  </div>
               </div>
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   .aspect {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .header {
         @include flex-row;
         @include flex-space-between;
         @include panel-1;

         border-radius: var(--titan-border-radius);
         @include padding-standard;

         width: 100%;

         .label {
            @include flex-row;
            @include flex-group-center;

            width: 100%;
            margin: 0 var(--titan-spacing-large);

            --input-font-size: var(--titan-font-size-large);
            --titan-input-height: 32px;
         }
      }

      .expandable-content {
         @include flex-column;
         @include flex-group-top;
         @include panel-3;

         border-radius: var(--titan-border-radius);

         width: calc(100% - 16px);

         @include padding-standard;
         @include font-size-small;

         .row {
            @include flex-row;
            @include flex-group-center;
            @include padding-top-large;

            width: 100%;

            &:not(:first-child) {
               @include border-top;
               @include margin-top-large;
            }

            .field {
               @include flex-row;
               @include flex-group-center;

               &:not(:first-child) {
                  @include separator-left-large;
               }

               i {
                  @include margin-right-standard;
               }

               .label {
                  @include flex-row;
                  @include flex-group-center;

                  font-weight: bold;
               }

               .input {
                  @include flex-row;
                  @include flex-group-center;
                  @include font-size-normal;

                  &:not(.checkbox) {
                     @include margin-left-standard;
                  }

                  &.number {
                     width: 56px;
                  }
               }
            }
         }
      }
   }
</style>
