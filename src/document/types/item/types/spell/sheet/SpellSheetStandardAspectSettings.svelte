<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { slide } from 'svelte/transition';
   import SpellSheetEnableAspectButton
      from '~/document/types/item/types/spell/sheet/SpellSheetEnableAspectButton.svelte';
   import DocumentSelect from '~/document/components/select/DocumentSelect.svelte';
   import DocumentResistanceSelect from '~/document/components/select/DocumentResistanceSelect.svelte';
   import DocumentCheckboxInput from '~/document/components/input/DocumentCheckboxInput.svelte';
   import ToggleOptionButton from '~/helpers/svelte-components/button/ToggleOptionButton.svelte';

   export let aspectOptions = void 0;
   let idx = 0;

   // Setup context variables
   const document = getContext('document');

   // Determines whether an aspect should have a details div
   function hasDetails() {
      return aspectOptions.settings || aspectOptions.template.resistanceCheck;
   }

   function toggleAspect(idx) {
      if ($document?.isOwner) {
         // If disabled, add the aspect
         if (idx === -1) {
            $document.system.addStandardAspect(aspectOptions.template);
         }
         else {
            // Otherwise remove the aspect
            $document.system.aspect.splice(idx, 1);

            // Update the document
            $document.update({
               system: {
                  aspect: $document.system.aspect,
               },
            });
         }
      }
   }

   $: if ($document) {
      idx = $document.system.aspect.findIndex((aspect) => {
         return aspect.label === aspectOptions.template.label;
      });
   }
</script>

<div class="aspect">
   <!--Header Button-->
   <SpellSheetEnableAspectButton
      enabled={idx !== -1}
      label={localize(aspectOptions.template.label)}
      cost={idx === -1 ? 0 : $document.system.aspect[idx].cost}
      on:click={() => {
         toggleAspect(idx);
      }}
   />
   <!--Aspect details-->
   {#if idx !== -1 && hasDetails()}
      <div class="details" transition:slide|local>
         <!--Initial Value Select-->
         {#if aspectOptions.settings.initialValueOptions}
            <div class="row">
               <div class="stat">
                  <DocumentSelect
                     bind:value={$document.system.aspect[idx].initialValue}
                     options={aspectOptions.settings.initialValueOptions}
                  />
               </div>
            </div>
         {/if}

         <!--Units Select-->
         {#if aspectOptions.settings.unitOptions}
            <div class="row">
               <div class="stat">
                  <!--Label-->
                  <div class="label">
                     {localize('units')}
                  </div>

                  <!--Value-->
                  <div class="input">
                     <DocumentSelect
                        bind:value={$document.system.aspect[idx].unit}
                        options={aspectOptions.settings.unitOptions}
                     />
                  </div>
               </div>
            </div>
         {/if}

         <!--Resistance Check-->
         {#if aspectOptions.template.resistanceCheck}
            <div class="row">
               <div class="stat">
                  <!--Label-->
                  <div class="label">
                     {localize('resistanceCheck')}
                  </div>

                  <!--Value-->
                  <div class="input">
                     <DocumentResistanceSelect
                        bind:value={$document.system.aspect[idx]
                           .resistanceCheck}
                        allowNone={true}
                     />
                  </div>
               </div>
            </div>
         {/if}

         <!--All Options-->
         {#if $document.system.aspect[idx].option}
            {#if $document.system.aspect[idx].allOptions !== undefined}
               <div class="row">
                  <div class="stat">
                     <!--Label-->
                     <div class="label">
                        {localize('allOptions')}
                     </div>

                     <!--Value-->
                     <div class="input">
                        <DocumentCheckboxInput
                           bind:value={$document.system.aspect[idx].allOptions}
                        />
                     </div>
                  </div>
               </div>
            {/if}

            <!--Option Toggles-->
            {#if $document.system.aspect[idx].allOptions !== true}
               <div class="row tags">
                  {#each aspectOptions.settings.option as option}
                     <div class="option">
                        <ToggleOptionButton
                           label={localize(option)}
                           enabled={$document.system.aspect[idx].option.indexOf(
                              option,
                           ) !== -1}
                           on:click={() => {
                              const optionIdx =
                                 $document.system.aspect[idx].option.indexOf(
                                    option,
                                 );
                              if (optionIdx === -1) {
                                 $document.system.aspect[idx].option.push(
                                    option,
                                 );
                              } else {
                                 $document.system.aspect[idx].option.splice(
                                    optionIdx,
                                    1,
                                 );
                              }
                              $document.update({
                                 system: {
                                    aspect: $document.system.aspect,
                                 },
                              });
                           }}
                        />
                     </div>
                  {/each}
               </div>
            {/if}
         {/if}
      </div>
   {/if}
</div>

<style lang="scss">
   .aspect {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .details {
         @include flex-column;
         @include flex-group-top;
         @include border-bottom-sides;

         @include font-size-small;
         @include panel-3;
         padding: 0 var(--padding-standard) var(--padding-standard);
         width: calc(100% - 30px);

         .row {
            @include flex-row;
            @include flex-group-center;
            flex-wrap: wrap;
            width: 100%;

            &:first-child:not(.tags) {
               margin-top: var(--padding-standard);
            }

            &:not(:first-child) {
               @include border-top;
               margin-top: var(--padding-standard);

               &:not(.tags) {
                  padding-top: var(--padding-standard);
               }
            }

            .stat {
               @include flex-row;
               @include flex-group-center;

               .label {
                  @include font-size-small;
                  font-weight: bold;
               }

               .input {
                  margin-left: var(--padding-standard);
               }
            }

            .option {
               @include tag-margin;
            }
         }
      }
   }
</style>
