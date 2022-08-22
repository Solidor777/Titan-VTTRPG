<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { slide } from "svelte/transition";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentSelect from "~/documents/components/DocumentSelect.svelte";
   import DocumentCheckboxInput from "~/documents/components/DocumentCheckboxInput.svelte";
   import SpellSheetEnableAspectButton from "./SpellSheetEnableAspectButton.svelte";

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

<ScrollingContainer>
   <div class="aspects-tab">
      <!--Range-->
      <div class="aspect">
         <!--Enable-->
         <div class="aspect-enable">
            <SpellSheetEnableAspectButton
               bind:enabled={$document.system.standardAspects.range.enabled}
               label={localize("LOCAL.range.label")}
               cost={$document.system.standardAspects.range.cost}
            />
         </div>
         {#if $document.system.standardAspects.range.enabled}
            <!--Content-->
            <div class="aspect-content" transition:slide|local>
               <div class="row">
                  <!--Range Options-->
                  <div>
                     <DocumentSelect bind:value={$document.system.standardAspects.range.value} options={rangeOptions} />
                  </div>

                  <!--Divider-->
                  <div class="divider" />

                  <!--Cost-->
                  <div class="stat">
                     <!--Label-->
                     <div class="label">
                        {localize("LOCAL.cost.label")}:
                     </div>

                     <!--Value-->
                     <div class="value">
                        {$document.system.standardAspects.range.cost}
                     </div>
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
            <div class="aspect-content" transition:slide|local>
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
            <div class="aspect-content" transition:slide|local>
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
   </div>
</ScrollingContainer>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .aspects-tab {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .aspect {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         margin: 0.25rem;
         padding: 0.25rem;

         .aspect-enable {
            @include flex-row;
            width: 100%;
         }

         .aspect-content {
            @include flex-column;
            @include flex-group-top;
            background-color: var(--label-background-color);
            padding: 0.5rem;
            width: calc(100% - 30px);
            border-style: var(--border-style);
            border-bottom-right-radius: var(--border-radius);
            border-bottom-left-radius: var(--border-radius);
            border-width: var(--border-width);
            border-color: var(--border-color-normal);
         }

         .row {
            @include flex-row;
            @include flex-space-evenly;
            width: 100%;

            .divider {
               @include border-left;
               height: 100%;
            }
         }

         .stat {
            @include flex-row;
            @include flex-group-center;
            font-weight: bold;

            .value {
               @include flex-row;
               @include flex-group-center;
               @include border;
               background-color: var(--static-label-background-color);
               width: 1.5rem;
               padding: 0.1rem;
               margin-left: 0.25rem;
            }
         }
      }
   }
</style>
