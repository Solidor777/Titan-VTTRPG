<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import WeaponSheetAttackSettings from "./WeaponSheetAttackSettings.svelte";

   // Setup context variables
   const application = getContext("external").application;
   const document = getContext("DocumentStore");
   const appState = getContext("ApplicationStateStore");

   // Initialize expanded state
   $document.system.attack.forEach((entry, idx) => {
      $appState.isExpanded.attacks[idx] = $appState.isExpanded.attacks[idx] ?? true;
   });

   // Initialize filter
   let filteredEntries = [];
   $: {
      filteredEntries = [];
      $document.system.attack.forEach((entry, idx) => {
         if (entry.label.toLowerCase().indexOf($appState.filter.attacks.toLowerCase()) !== -1) {
            filteredEntries.push(idx);
         }
      });
   }
</script>

<div class="tab">
   <!--Filter-->
   <div class="filter">
      <TopFilter bind:filter={$appState.filter.attacks} />
   </div>

   <!--Scroling Content-->
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.attacks}>
      <div class="scrolling-content">
         <!--Attacks List-->
         {#if $document.system.attack.length > 0}
            <ol>
               <!--Each attack-->
               {#each filteredEntries as idx ($document.system.attack[idx].uuid)}
                  <li transition:slide|local>
                     <WeaponSheetAttackSettings {idx} />
                  </li>
               {/each}
            </ol>
         {/if}

         <!--Add Attack Button-->
         <div class="add-entry-button">
            <EfxButton
               on:click={() => {
                  application.addAttack();
               }}
            >
               <!--Button Content-->
               <div class="button-content">
                  <!--Icon-->
                  <i class="fas fa-circle-plus" />

                  <!--Label-->
                  <div class="label">
                     {localize("addAttack")}
                  </div>
               </div>
            </EfxButton>
         </div>
      </div>
   </ScrollingContainer>
</div>

<!--For Each attack-->
<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .tab {
      @include flex-column;
      @include flex-group-top;
      height: 100%;
      width: 100%;

      .filter {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
      }

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         @include panel-2;
         width: 100%;
         height: 100%;

         ol {
            @include flex-column;
            @include flex-group-top;
            @include list;
            @include z-index-app;
            width: 100%;

            li {
               @include flex-row;
               @include flex-group-center;
               @include z-index-app;
               width: 100%;
               margin-top: 0.5rem;
            }
         }

         .add-entry-button {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            margin-top: 0.5rem;

            .button-content {
               @include flex-row;
               @include flex-group-center;

               i {
                  margin-right: 0.25rem;
               }
            }
         }
      }
   }
</style>
