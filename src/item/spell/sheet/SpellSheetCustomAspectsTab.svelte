<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { slide } from "svelte/transition";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentCheckboxInput from "~/documents/components/DocumentCheckboxInput.svelte";
   import DocumentResistanceSelect from "~/documents/components/DocumentResistanceSelect.svelte";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";
   import SpellSheetAddAspectButton from "./SpellSheetAddAspectButton.svelte";

   // Document reference
   const document = getContext("DocumentSheetObject");

   // Application refernce
   const application = getContext("external").application;

   // Resistance options
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

   // Filter for the aspects to display
   let filter = "";
   let filteredAspects = [];
   $: {
      filteredAspects = [];
      $document.system.customAspects.forEach((aspect, idx) => {
         if (aspect.label.toLowerCase().indexOf(filter.toLowerCase()) !== -1) {
            filteredAspects.push(idx);
         }
      });
   }
</script>

<div class="custom-aspects-tab">
   <!-- Filter-->
   <div class="filter">
      <!--Label-->
      <div class="label">
         {localize("LOCAL.filter.label")}
      </div>

      <!--Input-->
      <div class="input">
         <DocumentTextInput bind:value={filter} />
      </div>
   </div>

   <!--Scrolling Aspects list-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={application.scrollTop.customAspects}>
         <ol class="aspects-list">
            <!--Each Aspect-->
            {#each filteredAspects as idx}
               <li class="aspect" transition:slide|local>
                  <!--Header-->
                  <div class="aspect-header">
                     <!--Label-->
                     <div class="label-input">
                        <DocumentTextInput bind:value={$document.system.customAspects[idx].label} />
                     </div>

                     <!--Cost-->
                     <div class="aspect-cost">
                        <!--Label-->
                        <div class="label">
                           {localize("LOCAL.cost.label")}:
                        </div>

                        <!--Input-->
                        <div class="input">
                           <DocumentIntegerInput bind:value={$document.system.customAspects[idx].cost} min={0} />
                        </div>
                     </div>

                     <!--Delete button-->
                     <div>
                        <IconButton
                           icon={"fas fa-trash"}
                           efx={ripple}
                           on:click={() => {
                              $document.spell.removeCustomAspect(idx);
                           }}
                        />
                     </div>
                  </div>

                  <div class="row">
                     <!--Resistance Check-->
                     <div class="stat">
                        <!--Label-->
                        <div class="label">
                           {localize("LOCAL.resistanceCheck.label")}:
                        </div>

                        <!--Value-->
                        <div class="input">
                           <DocumentResistanceSelect
                              bind:value={$document.system.customAspects[idx].resistanceCheck}
                              options={resistanceSelectOptions}
                           />
                        </div>
                     </div>
                  </div>

                  <div class="row">
                     <!--Damage-->
                     <div class="stat">
                        <!--Label-->
                        <div class="label">
                           {localize("LOCAL.damage.label")}
                        </div>

                        <!--Value-->
                        <div class="input checkbox">
                           <DocumentCheckboxInput bind:value={$document.system.customAspects[idx].isDamage} />
                        </div>
                     </div>

                     <!--Healing-->
                     <div class="stat">
                        <!--Label-->
                        <div class="label">
                           {localize("LOCAL.healing.label")}
                        </div>

                        <!--Value-->
                        <div class="input checkbox">
                           <DocumentCheckboxInput bind:value={$document.system.customAspects[idx].isHealing} />
                        </div>
                     </div>

                     <!--Scaling-->
                     <div class="stat">
                        <!--Label-->
                        <div class="label">
                           {localize("LOCAL.scaling.label")}
                        </div>

                        <!--Value-->
                        <div class="input checkbox">
                           <DocumentCheckboxInput bind:value={$document.system.customAspects[idx].scaling} />
                        </div>
                     </div>
                  </div>

                  <!--Initial value-->
                  {#if $document.system.customAspects[idx].scaling}
                     <div class="row" transition:slide|local>
                        <div class="stat">
                           <!--Label-->
                           <div class="label">
                              {localize("LOCAL.initialValue.label")}:
                           </div>

                           <!--Value-->
                           <div class="input number">
                              <DocumentIntegerInput
                                 bind:value={$document.system.customAspects[idx].initialValue}
                                 min={0}
                              />
                           </div>
                        </div>
                     </div>
                  {/if}
               </li>
            {/each}
         </ol>
         <SpellSheetAddAspectButton />
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .custom-aspects-tab {
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      height: 100%;

      .filter {
         @include flex-row;
         @include flex-group-center;
         @include border-bottom;
         width: 100%;
         padding: 0.25rem;

         .label {
            font-weight: bold;
            margin-right: 0.25rem;
         }
      }

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
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
               @include border;
               width: 100%;
               font-size: 1rem;
               padding: 0.25rem;
               background-color: var(--label-background-color);

               .aspect-header {
                  @include flex-row;
                  @include flex-space-between;
                  box-sizing: border-box;
                  width: 100%;
                  font-weight: bold;
                  padding: 0.25rem;

                  .aspect-cost {
                     @include flex-row;
                     @include flex-group-center;
                     height: 100%;

                     .input {
                        margin-left: 0.25rem;
                        width: 3rem;
                     }
                  }

                  .label-input {
                     @include flex-row;
                     @include flex-group-center;
                     height: 100%;
                     --input-height: 100%;
                  }
               }

               .row {
                  @include flex-row;
                  @include flex-group-center;
                  font-size: 0.9rem;
                  --font-size: 0.9rem;
                  margin-top: 0.25rem;

                  .stat {
                     @include flex-row;
                     @include flex-group-center;

                     &:not(:first-child) {
                        @include border-left;
                        height: 100%;
                        margin-left: 0.5rem;
                        padding-left: 0.5rem;
                     }

                     .label {
                        font-weight: bold;
                     }

                     .input {
                        &:not(.checkbox) {
                           margin-left: 0.5rem;
                        }

                        &.number {
                           width: 3rem;
                        }
                     }
                  }
               }

               &:not(:first-child) {
                  margin-top: 0.25rem;
               }
            }
         }
      }
   }
</style>
