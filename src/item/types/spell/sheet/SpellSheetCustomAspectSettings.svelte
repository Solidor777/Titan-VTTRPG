<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import { slide } from "svelte/transition";
   import DocumentCheckboxInput from "~/documents/components/input/DocumentCheckboxInput.svelte";
   import DocumentResistanceSelect from "~/documents/components/select/DocumentResistanceSelect.svelte";
   import DocumentTextInput from "~/documents/components/input/DocumentTextInput.svelte";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";

   // Setup context variables
   const application = getContext("external").application;
   const document = getContext("DocumentStore");
   const appState = getContext("ApplicationStateStore");

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
                  icon="fas fa-angle-double-down"
                  on:click={() => {
                     $appState.isExpanded.customAspects[idx] = false;
                  }}
               />
            {:else}
               <!--Expand button-->
               <IconButton
                  icon="fas fa-angle-double-right"
                  on:click={() => {
                     $appState.isExpanded.customAspects[idx] = true;
                  }}
               />
            {/if}
         </div>

         <!--Label-->
         <div class="label">
            <DocumentTextInput bind:value={aspect.label} />
         </div>

         <!--Delete button-->
         <div class="delete-button">
            <!--Delete button-->
            <IconButton
               icon={"fas fa-trash"}
               on:click={() => {
                  application.removeCustomAspect(idx);
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
                  <div class="label">{localize("cost")}</div>

                  <!--Input-->
                  <div class="input number">
                     <DocumentIntegerInput bind:value={aspect.cost} min={0} />
                  </div>
               </div>

               <!--Resistance Check-->
               <div class="field">
                  <!--Label-->
                  <div class="label">{localize("resistanceCheck")}</div>

                  <!--Input-->
                  <div class="input">
                     <DocumentResistanceSelect bind:value={aspect.resistanceCheck} allowNone={true} />
                  </div>
               </div>
            </div>

            <div class="row">
               <!--Damage-->
               <div class="field">
                  <!--Icon-->
                  <i class="fas fa-burst" />

                  <!--Label-->
                  <div class="label">{localize("damage")}</div>

                  <!--Input-->
                  <div class="input checkbox">
                     <DocumentCheckboxInput bind:value={aspect.isDamage} />
                  </div>
               </div>

               <!--Healing-->
               <div class="field">
                  <!--Icon-->
                  <i class="fas fa-heart" />

                  <!--Label-->
                  <div class="label">{localize("healing")}</div>

                  <!--Input-->
                  <div class="input checkbox">
                     <DocumentCheckboxInput bind:value={aspect.isHealing} />
                  </div>
               </div>
            </div>

            <div class="row">
               <!--Scaling-->
               <div class="field">
                  <!--Label-->
                  <div class="label">{localize("scaling")}</div>

                  <!--Input-->
                  <div class="input checkbox">
                     <DocumentCheckboxInput bind:value={aspect.scaling} />
                  </div>
               </div>

               <!--Initial Value-->
               <div class="field">
                  <!--Label-->
                  <div class="label">{localize("initialValue")}</div>

                  <!--Input-->
                  <div class="input number">
                     <DocumentIntegerInput bind:value={aspect.initialValue} min={0} />
                  </div>
               </div>
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .aspect {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .header {
         @include border;
         @include flex-row;
         @include flex-space-between;
         @include panel-1;
         padding: 0.25rem;
         width: 100%;

         .label {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            margin: 0 0.5rem;
            --input-font-size: var(--font-size-large);
            --input-height: 2rem;
         }
      }

      .expandable-content {
         @include flex-column;
         @include flex-group-top;
         @include border-bottom-sides;
         @include panel-3;
         width: calc(100% - 1rem);
         padding: 0.25rem;
         @include font-size-small;

         .row {
            @include flex-row;
            @include flex-group-center;
            padding-top: 0.5rem;
            width: 100%;

            &:not(:first-child) {
               @include border-top;
               margin-top: 0.5rem;
            }

            .field {
               @include flex-row;
               @include flex-group-center;

               &:not(:first-child) {
                  @include border-left;
                  margin-left: 0.5rem;
                  padding-left: 0.5rem;
               }

               i {
                  margin-right: 0.25rem;
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
                     margin-left: 0.25rem;
                  }

                  &.number {
                     width: 2rem;
                  }
               }
            }
         }
      }
   }
</style>
