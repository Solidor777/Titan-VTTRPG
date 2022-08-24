<script>
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { slide } from "svelte/transition";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentSelect from "~/documents/components/DocumentSelect.svelte";
   import DocumentCheckboxInput from "~/documents/components/DocumentCheckboxInput.svelte";
   import DocumentResistanceSelectAllowNone from "~/documents/components/DocumentResistanceSelectAllowNone.svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";
   import SpellSheetEnableAspectButton from "./SpellSheetEnableAspectButton.svelte";
   import SpellSheetToggleAspectOptionButton from "./SpellSheetToggleAspectOptionButton.svelte";

   // Setup
   const document = getContext("DocumentSheetObject");

   // Range Options
   const rangeOptions = [
      {
         value: "self",
         label: localize("LOCAL.self.label"),
      },
      {
         value: "touch",
         label: localize("LOCAL.touch.label"),
      },
      {
         value: "10m",
         label: localize("LOCAL.10m.label"),
      },
      {
         value: "30m",
         label: localize("LOCAL.30m.label"),
      },
      {
         value: "50m",
         label: localize("LOCAL.50m.label"),
      },
   ];

   // Target Options
   const targetOptions = [
      {
         value: "target",
         label: localize("LOCAL.target.label"),
      },
      {
         value: "5mRadius",
         label: localize("LOCAL.5mRadius.label"),
      },
      {
         value: "10mRadius",
         label: localize("LOCAL.10mRadius.label"),
      },
   ];
</script>

<div class="aspects-tab">
   <ScrollingContainer>
      <div class="aspects-list">
         <!--Range-->
         <div class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.range.enabled}
                  label={localize(`LOCAL.range.label`)}
                  cost={$document.system.standardAspects.range.cost}
               />
            </div>
            {#if $document.system.standardAspects.range.enabled}
               <!--Content-->
               <div class="aspect-details" transition:slide|local>
                  <div class="row">
                     <!--Range Options-->
                     <div>
                        <DocumentSelect
                           bind:value={$document.system.standardAspects.range.value}
                           options={rangeOptions}
                        />
                     </div>
                  </div>
               </div>
            {/if}
         </div>

         <!--Target-->
         <div class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.target.enabled}
                  label={localize("LOCAL.target.label")}
                  cost={$document.system.standardAspects.target.cost}
               />
            </div>
            {#if $document.system.standardAspects.target.enabled}
               <!--Content-->
               <div class="aspect-details" transition:slide|local>
                  <div class="row">
                     <!--Range Options-->
                     <div>
                        <DocumentSelect
                           bind:value={$document.system.standardAspects.target.value}
                           options={targetOptions}
                        />
                     </div>
                  </div>
               </div>
            {/if}
         </div>

         <!--Damage-->
         <div class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.damage.enabled}
                  label={localize("LOCAL.damage.label")}
                  cost={$document.system.standardAspects.damage.cost}
               />
            </div>
            {#if $document.system.standardAspects.damage.enabled}
               <!--Content-->
               <div class="aspect-details" transition:slide|local>
                  <div class="row">
                     <!--Ignore Armor-->
                     <div class="stat">
                        <!--Label-->
                        <div class="label">
                           {localize("LOCAL.ignoreArmor.label")}:
                        </div>

                        <!--Value-->
                        <div class="input">
                           <DocumentCheckboxInput bind:value={$document.system.standardAspects.damage.ignoreArmor} />
                        </div>
                     </div>

                     <div class="divider" />

                     <!--Resistance Armor-->
                     <div class="stat">
                        <!--Label-->
                        <div class="label">
                           {localize("LOCAL.resistance.label")}:
                        </div>

                        <!--Value-->
                        <div class="input">
                           <DocumentResistanceSelectAllowNone
                              bind:value={$document.system.standardAspects.damage.resistance}
                           />
                        </div>
                     </div>
                  </div>
               </div>
            {/if}
         </div>

         <!--Healing-->
         <div class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.healing.enabled}
                  label={localize("LOCAL.healing.label")}
                  cost={$document.system.standardAspects.healing.cost}
               />
            </div>
         </div>

         <!--Rounds-->
         <div class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.rounds.enabled}
                  label={localize("LOCAL.rounds.label")}
                  cost={$document.system.standardAspects.rounds.cost}
               />
            </div>
         </div>

         <!--Inflict Condition-->
         <div class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.inflictCondition.enabled}
                  label={localize("LOCAL.inflictCondition.label")}
                  cost={$document.system.standardAspects.inflictCondition.cost}
               />
            </div>

            {#if $document.system.standardAspects.inflictCondition.enabled}
               <!--Content-->
               <div class="aspect-details" transition:slide|local>
                  <div class="row">
                     <!--Resistance-->
                     <div class="stat">
                        <!--Label-->
                        <div class="label">
                           {localize("LOCAL.resistance.label")}:
                        </div>

                        <!--Value-->
                        <div class="input">
                           <DocumentResistanceSelectAllowNone
                              bind:value={$document.system.standardAspects.inflictCondition.resistance}
                           />
                        </div>
                     </div>
                  </div>

                  <!--Condition toggles-->
                  <div class="toggles">
                     {#each Object.entries($document.system.standardAspects.inflictCondition.condition) as [condition]}
                        <SpellSheetToggleAspectOptionButton
                           label={localize(`LOCAL.${condition}.label`)}
                           bind:enabled={$document.system.standardAspects.inflictCondition.condition[condition]}
                        />
                     {/each}
                  </div>
               </div>
            {/if}
         </div>

         <!--Remove Condition-->
         <div class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.removeCondition.enabled}
                  label={localize("LOCAL.removeCondition.label")}
                  cost={$document.system.standardAspects.removeCondition.cost}
               />
            </div>

            {#if $document.system.standardAspects.removeCondition.enabled}
               <!--Content-->
               <div class="aspect-details" transition:slide|local>
                  <div class="row">
                     <!--Resistance-->
                     <div class="stat">
                        <!--Label-->
                        <div class="label">
                           {localize("LOCAL.all.label")}:
                        </div>

                        <!--Value-->
                        <div class="input">
                           <DocumentCheckboxInput bind:value={$document.system.standardAspects.removeCondition.all} />
                        </div>
                     </div>
                  </div>

                  {#if !$document.system.standardAspects.removeCondition.all}
                     <!--Condition toggles-->
                     <div class="toggles">
                        {#each Object.entries($document.system.standardAspects.removeCondition.condition) as [condition]}
                           <SpellSheetToggleAspectOptionButton
                              label={localize(`LOCAL.${condition}.label`)}
                              bind:enabled={$document.system.standardAspects.removeCondition.condition[condition]}
                           />
                        {/each}
                     </div>
                  {/if}
               </div>
            {/if}
         </div>
      </div>
   </ScrollingContainer>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .aspects-tab {
      width: 100%;
      height: 100%;

      .aspects-list {
         @include flex-column;
         @include flex-group-top;
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

                  .divider {
                     @include border-right;
                     height: 100%;
                     padding-right: 0.5rem;
                     margin-right: 0.5rem;
                     margin-left: 0.5rem;
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
