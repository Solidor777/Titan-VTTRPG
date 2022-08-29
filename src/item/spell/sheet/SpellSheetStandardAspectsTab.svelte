<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { slide } from "svelte/transition";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentSelect from "~/documents/components/DocumentSelect.svelte";
   import DocumentCheckboxInput from "~/documents/components/DocumentCheckboxInput.svelte";
   import DocumentResistanceSelectAllowNone from "~/documents/components/DocumentResistanceSelectAllowNone.svelte";
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
   ];

   // Target Options
   const targetOptions = [
      {
         value: "target",
         label: localize("LOCAL.target.label"),
      },
      {
         value: "m5Radius",
         label: localize("LOCAL.m5Radius.label"),
      },
      {
         value: "m10Radius",
         label: localize("LOCAL.m10Radius.label"),
      },
   ];
</script>

<div class="aspects-tab">
   <ScrollingContainer>
      <ol class="aspects-list">
         <!--Range-->
         <li class="aspect">
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
         </li>

         <!--Target-->
         <li class="aspect">
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
         </li>

         <!--Damage-->
         <li class="aspect">
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
                           {localize("LOCAL.resistanceCheck.label")}:
                        </div>

                        <!--Value-->
                        <div class="input">
                           <DocumentResistanceSelectAllowNone
                              bind:value={$document.system.standardAspects.damage.resistanceCheck}
                           />
                        </div>
                     </div>
                  </div>
               </div>
            {/if}
         </li>

         <!--Healing-->
         <li class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.healing.enabled}
                  label={localize("LOCAL.healing.label")}
                  cost={$document.system.standardAspects.healing.cost}
               />
            </div>
         </li>

         <!--Rounds-->
         <li class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.rounds.enabled}
                  label={localize("LOCAL.rounds.label")}
                  cost={$document.system.standardAspects.rounds.cost}
               />
            </div>
         </li>

         <!--Decrease Mod-->
         <li class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.decreaseMod.enabled}
                  label={localize("LOCAL.decreaseMod.label")}
                  cost={$document.system.standardAspects.decreaseMod.cost}
               />
            </div>

            {#if $document.system.standardAspects.decreaseMod.enabled}
               <!--Content-->
               <div class="aspect-details" transition:slide|local>
                  <div class="row">
                     <!--Resistance-->
                     <div class="stat">
                        <!--Label-->
                        <div class="label">
                           {localize("LOCAL.resistanceCheck.label")}:
                        </div>

                        <!--Value-->
                        <div class="input">
                           <DocumentResistanceSelectAllowNone
                              bind:value={$document.system.standardAspects.decreaseMod.resistanceCheck}
                           />
                        </div>
                     </div>
                  </div>

                  <!--Mod toggles-->
                  <div class="toggles">
                     {#each Object.entries($document.system.standardAspects.decreaseMod.option) as [mod]}
                        <SpellSheetToggleAspectOptionButton
                           label={localize(`LOCAL.${mod}.label`)}
                           bind:enabled={$document.system.standardAspects.decreaseMod.option[mod]}
                        />
                     {/each}
                  </div>
               </div>
            {/if}
         </li>

         <!--Increase Mod-->
         <li class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.increaseMod.enabled}
                  label={localize("LOCAL.increaseMod.label")}
                  cost={$document.system.standardAspects.increaseMod.cost}
               />
            </div>

            {#if $document.system.standardAspects.increaseMod.enabled}
               <!--Content-->
               <div class="aspect-details" transition:slide|local>
                  <!--Mod toggles-->
                  <div class="toggles">
                     {#each Object.entries($document.system.standardAspects.increaseMod.option) as [mod]}
                        <SpellSheetToggleAspectOptionButton
                           label={localize(`LOCAL.${mod}.label`)}
                           bind:enabled={$document.system.standardAspects.increaseMod.option[mod]}
                        />
                     {/each}
                  </div>
               </div>
            {/if}
         </li>

         <!--Decrease Rating-->
         <li class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.decreaseRating.enabled}
                  label={localize("LOCAL.decreaseRating.label")}
                  cost={$document.system.standardAspects.decreaseRating.cost}
               />
            </div>

            {#if $document.system.standardAspects.decreaseRating.enabled}
               <!--Content-->
               <div class="aspect-details" transition:slide|local>
                  <div class="row">
                     <!--Resistance-->
                     <div class="stat">
                        <!--Label-->
                        <div class="label">
                           {localize("LOCAL.resistanceCheck.label")}:
                        </div>

                        <!--Value-->
                        <div class="input">
                           <DocumentResistanceSelectAllowNone
                              bind:value={$document.system.standardAspects.decreaseRating.resistanceCheck}
                           />
                        </div>
                     </div>
                  </div>

                  <!--Rating toggles-->
                  <div class="toggles">
                     {#each Object.entries($document.system.standardAspects.decreaseRating.option) as [rating]}
                        <SpellSheetToggleAspectOptionButton
                           label={localize(`LOCAL.${rating}.label`)}
                           bind:enabled={$document.system.standardAspects.decreaseRating.option[rating]}
                        />
                     {/each}
                  </div>
               </div>
            {/if}
         </li>

         <!--Increase Rating-->
         <li class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.increaseRating.enabled}
                  label={localize("LOCAL.increaseRating.label")}
                  cost={$document.system.standardAspects.increaseRating.cost}
               />
            </div>

            {#if $document.system.standardAspects.increaseRating.enabled}
               <!--Content-->
               <div class="aspect-details" transition:slide|local>
                  <!--Rating toggles-->
                  <div class="toggles">
                     {#each Object.entries($document.system.standardAspects.increaseRating.option) as [rating]}
                        <SpellSheetToggleAspectOptionButton
                           label={localize(`LOCAL.${rating}.label`)}
                           bind:enabled={$document.system.standardAspects.increaseRating.option[rating]}
                        />
                     {/each}
                  </div>
               </div>
            {/if}
         </li>

         <!--Decrease Attribute-->
         <li class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.decreaseAttribute.enabled}
                  label={localize("LOCAL.decreaseAttribute.label")}
                  cost={$document.system.standardAspects.decreaseAttribute.cost}
               />
            </div>

            {#if $document.system.standardAspects.decreaseAttribute.enabled}
               <!--Content-->
               <div class="aspect-details" transition:slide|local>
                  <div class="row">
                     <!--Resistance-->
                     <div class="stat">
                        <!--Label-->
                        <div class="label">
                           {localize("LOCAL.resistanceCheck.label")}:
                        </div>

                        <!--Value-->
                        <div class="input">
                           <DocumentResistanceSelectAllowNone
                              bind:value={$document.system.standardAspects.decreaseAttribute.resistanceCheck}
                           />
                        </div>
                     </div>
                  </div>

                  <!--Attribute toggles-->
                  <div class="toggles">
                     {#each Object.entries($document.system.standardAspects.decreaseAttribute.option) as [attribute]}
                        <SpellSheetToggleAspectOptionButton
                           label={localize(`LOCAL.${attribute}.label`)}
                           bind:enabled={$document.system.standardAspects.decreaseAttribute.option[attribute]}
                        />
                     {/each}
                  </div>
               </div>
            {/if}
         </li>

         <!--Increase Attribute-->
         <li class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.increaseAttribute.enabled}
                  label={localize("LOCAL.increaseAttribute.label")}
                  cost={$document.system.standardAspects.increaseAttribute.cost}
               />
            </div>

            {#if $document.system.standardAspects.increaseAttribute.enabled}
               <!--Content-->
               <div class="aspect-details" transition:slide|local>
                  <!--Attribute toggles-->
                  <div class="toggles">
                     {#each Object.entries($document.system.standardAspects.increaseAttribute.option) as [attribute]}
                        <SpellSheetToggleAspectOptionButton
                           label={localize(`LOCAL.${attribute}.label`)}
                           bind:enabled={$document.system.standardAspects.increaseAttribute.option[attribute]}
                        />
                     {/each}
                  </div>
               </div>
            {/if}
         </li>

         <!--Decrease Skill-->
         <li class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.decreaseSkill.enabled}
                  label={localize("LOCAL.decreaseSkill.label")}
                  cost={$document.system.standardAspects.decreaseSkill.cost}
               />
            </div>

            {#if $document.system.standardAspects.decreaseSkill.enabled}
               <!--Content-->
               <div class="aspect-details" transition:slide|local>
                  <div class="row">
                     <!--Resistance-->
                     <div class="stat">
                        <!--Label-->
                        <div class="label">
                           {localize("LOCAL.resistanceCheck.label")}:
                        </div>

                        <!--Value-->
                        <div class="input">
                           <DocumentResistanceSelectAllowNone
                              bind:value={$document.system.standardAspects.decreaseSkill.resistanceCheck}
                           />
                        </div>
                     </div>
                  </div>

                  <!--Skill toggles-->
                  <div class="toggles">
                     {#each Object.entries($document.system.standardAspects.decreaseSkill.option) as [skill]}
                        <SpellSheetToggleAspectOptionButton
                           label={localize(`LOCAL.${skill}.label`)}
                           bind:enabled={$document.system.standardAspects.decreaseSkill.option[skill]}
                        />
                     {/each}
                  </div>
               </div>
            {/if}
         </li>

         <!--Increase Skill-->
         <li class="aspect">
            <!--Enable-->
            <div class="aspect-enable">
               <SpellSheetEnableAspectButton
                  bind:enabled={$document.system.standardAspects.increaseSkill.enabled}
                  label={localize("LOCAL.increaseSkill.label")}
                  cost={$document.system.standardAspects.increaseSkill.cost}
               />
            </div>

            {#if $document.system.standardAspects.increaseSkill.enabled}
               <!--Content-->
               <div class="aspect-details" transition:slide|local>
                  <!--Skill toggles-->
                  <div class="toggles">
                     {#each Object.entries($document.system.standardAspects.increaseSkill.option) as [skill]}
                        <SpellSheetToggleAspectOptionButton
                           label={localize(`LOCAL.${skill}.label`)}
                           bind:enabled={$document.system.standardAspects.increaseSkill.option[skill]}
                        />
                     {/each}
                  </div>
               </div>
            {/if}
         </li>

         <!--Inflict Condition-->
         <li class="aspect">
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
                           {localize("LOCAL.resistanceCheck.label")}:
                        </div>

                        <!--Value-->
                        <div class="input">
                           <DocumentResistanceSelectAllowNone
                              bind:value={$document.system.standardAspects.inflictCondition.resistanceCheck}
                           />
                        </div>
                     </div>
                  </div>

                  <!--Condition toggles-->
                  <div class="toggles">
                     {#each Object.entries($document.system.standardAspects.inflictCondition.option) as [condition]}
                        <SpellSheetToggleAspectOptionButton
                           label={localize(`LOCAL.${condition}.label`)}
                           bind:enabled={$document.system.standardAspects.inflictCondition.option[condition]}
                        />
                     {/each}
                  </div>
               </div>
            {/if}
         </li>

         <!--Remove Condition-->
         <li class="aspect">
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
                           <DocumentCheckboxInput
                              bind:value={$document.system.standardAspects.removeCondition.allOptions}
                           />
                        </div>
                     </div>
                  </div>

                  {#if !$document.system.standardAspects.removeCondition.allOptions}
                     <!--Condition toggles-->
                     <div class="toggles" transition:slide|local>
                        {#each Object.entries($document.system.standardAspects.removeCondition.option) as [condition]}
                           <SpellSheetToggleAspectOptionButton
                              label={localize(`LOCAL.${condition}.label`)}
                              bind:enabled={$document.system.standardAspects.removeCondition.option[condition]}
                           />
                        {/each}
                     </div>
                  {/if}
               </div>
            {/if}
         </li>
      </ol>
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
