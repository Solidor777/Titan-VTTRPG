<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { slide } from "svelte/transition";
   import { getSpellRangeOptions } from "~/item/spell/SpellRangeOptions.js";
   import { getSpellRadiusOptions } from "~/item/spell/SpellRadiusOptions.js";
   import { getSpellIncreaseDecreaseSpeedOptions } from "~/item/spell/SpellIncreaseDecreaseSpeedOptions.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentSelect from "~/documents/components/DocumentSelect.svelte";
   import DocumentCheckboxInput from "~/documents/components/DocumentCheckboxInput.svelte";
   import DocumentResistanceSelectAllowNone from "~/documents/components/DocumentResistanceSelectAllowNone.svelte";
   import SpellSheetEnableAspectButton from "./SpellSheetEnableAspectButton.svelte";
   import SpellSheetToggleAspectOptionButton from "./SpellSheetToggleAspectOptionButton.svelte";

   // Document Setup
   const document = getContext("DocumentSheetObject");

   // Initialize select options
   const selectOptions = {
      range: getSpellRangeOptions(),
      radius: getSpellRadiusOptions(),
   };
   for (const [key, value] of Object.entries(selectOptions)) {
      value.forEach((element) => {
         element.label = localize(`LOCAL.${element.value}.label`);
      });
   }
   selectOptions.increaseSpeed = getSpellIncreaseDecreaseSpeedOptions();
   selectOptions.increaseSpeed.forEach((element) => {
      element.label = localize(`LOCAL.m${element.value}.label`);
   });
   selectOptions.decreaseSpeed = selectOptions.increaseSpeed;

   function hasDetails(key) {
      return (
         $document.system.standardAspects[key].option ||
         $document.system.standardAspects[key].value ||
         $document.system.standardAspects[key].resistanceCheck
      );
   }
</script>

<div class="standard-aspects-tab">
   <ScrollingContainer>
      <ol class="aspects-list">
         <!--Each Aspect-->
         {#each Object.entries($document.system.standardAspects) as [key]}
            <li class="aspect">
               <!--Enable Header-->
               <div class="aspect-enable">
                  <SpellSheetEnableAspectButton
                     bind:enabled={$document.system.standardAspects[key].enabled}
                     label={localize(`LOCAL.${key}.label`)}
                     cost={$document.system.standardAspects[key].cost}
                  />
               </div>
               {#if $document.system.standardAspects[key].enabled && hasDetails(key)}
                  <!--Content-->
                  <div class="aspect-details" transition:slide|local>
                     {#if $document.system.standardAspects[key].value}
                        <!--Select Options-->
                        <div class="row">
                           <div>
                              <!--Select Value-->
                              <DocumentSelect
                                 bind:value={$document.system.standardAspects[key].value}
                                 options={selectOptions[key]}
                              />
                           </div>
                        </div>
                     {/if}

                     {#if $document.system.standardAspects[key].resistanceCheck}
                        <!--Resistance Check-->
                        <div class="row">
                           <div class="stat">
                              <!--Label-->
                              <div class="label">
                                 {localize("LOCAL.resistanceCheck.label")}:
                              </div>

                              <!--Value-->
                              <div class="input">
                                 <DocumentResistanceSelectAllowNone
                                    bind:value={$document.system.standardAspects[key].resistanceCheck}
                                 />
                              </div>
                           </div>
                        </div>
                     {/if}

                     {#if $document.system.standardAspects[key].allOptions !== undefined}
                        <!--All Options-->
                        <div class="row">
                           <div class="stat">
                              <!--Label-->
                              <div class="label">
                                 {localize("LOCAL.allOptions.label")}:
                              </div>

                              <!--Value-->
                              <div class="input">
                                 <DocumentCheckboxInput bind:value={$document.system.standardAspects[key].allOptions} />
                              </div>
                           </div>
                        </div>
                     {/if}

                     {#if $document.system.standardAspects[key].option}
                        <!--Option Toggles-->
                        <div class="toggles">
                           {#each Object.entries($document.system.standardAspects[key].option) as [option]}
                              <SpellSheetToggleAspectOptionButton
                                 label={localize(`LOCAL.${option}.label`)}
                                 bind:enabled={$document.system.standardAspects[key].option[option]}
                              />
                           {/each}
                        </div>
                     {/if}
                  </div>
               {/if}
            </li>
         {/each}
      </ol>
   </ScrollingContainer>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .standard-aspects-tab {
      width: 100%;
      height: 100%;

      .aspects-list {
         @include flex-column;
         @include flex-group-top;
         list-style: none;
         padding: 0;
         margin: 0;
         width: 100%;

         .aspect {
            @include flex-column;
            @include flex-group-top;
            width: 100%;
            margin: 0.25rem;

            .aspect-enable {
               @include flex-row;
               width: 100%;
            }

            .aspect-details {
               @include flex-column;
               @include flex-group-top;
               @include z-index-app;
               padding: 0.5rem;
               width: calc(100% - 30px);
               background-color: var(--label-background-color);
               border-right: var(--border-style);
               border-left: var(--border-style);
               border-bottom: var(--border-style);
               border-bottom-right-radius: var(--border-radius);
               border-bottom-left-radius: var(--border-radius);
               border-width: var(--border-width);
               border-color: var(--border-color-normal);
               font-size: 0.9rem;
               --font-size: 0.9rem;

               .row {
                  @include flex-row;
                  @include flex-group-center;
                  width: 100%;
                  &:not(:first-child) {
                     margin-top: 0.5rem;
                  }

                  .stat {
                     @include flex-row;
                     @include flex-group-center;
                     font-weight: bold;

                     .input {
                        margin-left: 0.25rem;
                     }
                  }
               }

               .toggles {
                  @include flex-row;
                  @include flex-group-center;
                  margin-top: 0.5rem;
                  flex-wrap: wrap;
                  width: 100%;
               }
            }
         }
      }
   }
</style>
