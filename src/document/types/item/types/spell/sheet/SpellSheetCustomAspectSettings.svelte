<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {slide} from 'svelte/transition';
   import DocumentCheckboxInput from '~/document/sheet/input/DocumentCheckboxInput.svelte';
   import DocumentResistanceSelect from '~/document/sheet/select/DocumentResistanceSelect.svelte';
   import DocumentTextInput from '~/document/sheet/input/DocumentTextInput.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentIntegerInput from '~/document/sheet/input/DocumentIntegerInput.svelte';
   import {COLLAPSED_ICON, DAMAGE_ICON, DELETE_ICON, EXPANDED_ICON, HEALING_ICON} from '~/system/Icons.js';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type object Reference to the Application State store. */
   const appState = getContext('applicationState');

   // Idx of the custom aspect being represented
   export let idx = void 0;

   $: aspect = $document.system.customAspect[idx];
   $: isExpanded = $appState.isExpanded.customAspects[idx];
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
                  icon="{EXPANDED_ICON}"
                  on:click={() => {
                     $appState.isExpanded.customAspects[idx] = false;
                  }}
               />
            {:else}
               <!--Expand button-->
               <IconButton
                  icon="{COLLAPSED_ICON}"
                  on:click={() => {
                     $appState.isExpanded.customAspects[idx] = true;
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
               on:click={() => {
                  $document.system.removeCustomAspect(idx);
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
                  <i class="{DAMAGE_ICON}"/>

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
                  <i class="{HEALING_ICON}"/>

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
         @include border;
         @include flex-row;
         @include flex-space-between;
         @include panel-1;

         padding: var(--titan-padding-standard);
         width: 100%;

         .label {
            @include flex-row;
            @include flex-group-center;

            width: 100%;
            margin: 0 var(--titan-padding-large);

            --input-font-size: var(--titan-font-size-large);
            --titan-input-height: 32px;
         }
      }

      .expandable-content {
         @include flex-column;
         @include flex-group-top;
         @include border-bottom-sides;
         @include panel-3;

         width: calc(100% - 16px);
         padding: var(--titan-padding-standard);

         @include font-size-small;

         .row {
            @include flex-row;
            @include flex-group-center;

            padding-top: var(--titan-padding-large);
            width: 100%;

            &:not(:first-child) {
               @include border-top;

               margin-top: var(--titan-padding-large);
            }

            .field {
               @include flex-row;
               @include flex-group-center;

               &:not(:first-child) {
                  @include border-left;

                  margin-left: var(--titan-padding-large);
                  padding-left: var(--titan-padding-large);
               }

               i {
                  margin-right: var(--titan-padding-standard);
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
                     margin-left: var(--titan-padding-standard);
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
