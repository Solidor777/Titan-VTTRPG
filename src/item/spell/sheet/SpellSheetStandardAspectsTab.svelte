<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { slide } from "svelte/transition";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentSelect from "~/documents/components/DocumentSelect.svelte";
   import DocumentCheckboxInput from "~/documents/components/DocumentCheckboxInput.svelte";
   import DocumentResistanceSelect from "~/documents/components/DocumentResistanceSelect.svelte";
   import SpellSheetEnableAspectButton from "./SpellSheetEnableAspectButton.svelte";
   import SpellSheetToggleAspectOptionButton from "./SpellSheetToggleAspectOptionButton.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";

   // Document reference
   const document = getContext("DocumentSheetObject");

   // Application refernce
   const application = getContext("external").application;

   // Resistance select options
   const resistanceSelectOptions = [
      {
         label: localize("LOCAL.reflexes.label"),
         value: "reflexes",
      },
      {
         label: localize("LOCAL.resilience.label"),
         value: "resilience",
      },
      {
         label: localize("LOCAL.willpower.label"),
         value: "willpower",
      },
      {
         label: localize("LOCAL.none.label"),
         value: "none",
      },
   ];

   // Initialize select options
   const selectOptions = {
      range: [
         {
            value: "self",
            label: localize("LOCAL.self.label"),
         },
         {
            value: "touch",
            label: localize("LOCAL.touch.label"),
         },
         {
            value: "m10",
            label: localize("LOCAL.m10.label"),
         },
         {
            value: "m30",
            label: localize("LOCAL.m30.label"),
         },
         {
            value: "m50",
            label: localize("LOCAL.m50.label"),
         },
      ],
      radius: [
         {
            value: "m5",
            label: localize("LOCAL.m5.label"),
         },
         {
            value: "m10",
            label: localize("LOCAL.m10.label"),
         },
      ],
      duration: [
         {
            value: "rounds",
            label: localize("LOCAL.rounds.label"),
         },
         {
            value: "minutes",
            label: localize("LOCAL.minutes.label"),
         },
      ],
      increaseSpeed: [
         {
            value: "m5",
            label: localize("LOCAL.m5.label"),
         },
         {
            value: "m10",
            label: localize("LOCAL.m10.label"),
         },
      ],
   };
   selectOptions.decreaseSpeed = selectOptions.increaseSpeed;

   // Determines whether an aspect should have a details div
   function hasDetails(key) {
      return (
         $document.system.standardAspects[key].option ||
         $document.system.standardAspects[key].value ||
         $document.system.standardAspects[key].resistanceCheck
      );
   }

   // Filter for the aspects to display
   let filter = "";

   $: filteredAspects = Object.keys($document.system.standardAspects).filter(
      (key) => localize(`LOCAL.${key}.label`).toLowerCase().indexOf(filter.toLowerCase()) !== -1
   );
</script>

<div class="standard-aspects-tab">
   <!--Filter-->
   <TopFilter bind:filter />

   <!--Scrolling aspects list-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={application.scrollTop.standardAspects}>
         <ol class="aspects-list">
            <!--Each Aspect-->
            {#each filteredAspects as key}
               <!--Filter the Aspects-->

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
                                    <DocumentResistanceSelect
                                       bind:value={$document.system.standardAspects[key].resistanceCheck}
                                       options={resistanceSelectOptions}
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
                                    <DocumentCheckboxInput
                                       bind:value={$document.system.standardAspects[key].allOptions}
                                    />
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
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .standard-aspects-tab {
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      height: 100%;

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         height: 100%;

         .aspects-list {
            @include flex-column;
            @include flex-group-top;
            @include z-index-app;
            list-style: none;
            padding: 0;
            margin: 0;
            width: 100%;

            .aspect {
               @include flex-column;
               @include flex-group-top;
               width: 100%;

               &:not(:first-child) {
                  margin-top: 0.25rem;
               }

               .aspect-enable {
                  @include flex-row;
                  width: 100%;
               }

               .aspect-details {
                  @include flex-column;
                  @include flex-group-top;
                  @include border-bottom-sides;
                  @include z-index-app;
                  padding: 0.5rem;
                  width: calc(100% - 30px);
                  background: var(--label-background-color);
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
   }
</style>
