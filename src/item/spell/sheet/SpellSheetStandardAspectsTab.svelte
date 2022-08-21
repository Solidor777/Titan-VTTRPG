<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { slide } from "svelte/transition";
   import DocumentSelect from "~/documents/components/DocumentSelect.svelte";
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
</script>

<div class="aspects-tab">
   <!--Range-->
   <div class="aspect">
      <!--Enable-->
      <div class="aspect-enable">
         <SpellSheetEnableAspectButton
            bind:enabled={$document.system.standardAspects.range.enabled}
            label={localize("LOCAL.range.label")}
         />
      </div>
      {#if $document.system.standardAspects.range.enabled}
         <!--Content-->
         <div class="aspect-content" transition:slide>
            <div class="row">
               <div>
                  <DocumentSelect bind:value={$document.system.standardAspects.range.value} options={rangeOptions} />
               </div>
               <div class="divider" />
               <div class="stat">
                  <div class="label">
                     {localize("LOCAL.cost.label")}:
                  </div>
                  <div class="value">
                     {$document.system.standardAspects.range.cost}
                  </div>
               </div>
            </div>
         </div>
      {/if}
   </div>
</div>

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
               padding: 0.25rem;
               margin-left: 0.25rem;
            }
         }
      }
   }
</style>
