<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/TopFilter.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import SpellSheetCustomAspectSettings
      from '~/document/types/item/types/spell/sheet/SpellSheetCustomAspectSettings.svelte';
   import { CREATE_ICON } from '~/system/Icons.js';

   // Setup context variables
   const document = getContext('document');
   const appState = getContext('applicationState');

   // Initialize expanded state
   $document.system.customAspect.forEach((entry, idx) => {
      $appState.isExpanded.customAspects[idx] =
         $appState.isExpanded.customAspects[idx] ?? true;
   });

   // Initialize filtered entries
   let filteredEntries = [];
   $: {
      filteredEntries = [];
      $document.system.customAspect.forEach((entry, idx) => {
         if (
            entry.label
               .toLowerCase()
               .indexOf($appState.filter.customAspects.toLowerCase()) !== -1
         ) {
            filteredEntries.push(idx);
         }
      });
   }
</script>

<div class="tab">
   <!--Filter-->
   {#if $document.system.customAspect && $document.system.customAspect.length > 0}
      <div class="filter" transition:slide|local>
         <TopFilter bind:filter={$appState.filter.customAspects}/>
      </div>
   {/if}

   <!--Scrolling Aspects list-->
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.customAspect}>
      <div class="scrolling-content">
         <!--Aspects List-->
         {#if $document.system.customAspect.length > 0}
            <ol out:slide|local>
               <!--Each Aspect-->
               {#each filteredEntries as idx ($document.system.customAspect[idx].uuid)}
                  <li out:slide|local>
                     <SpellSheetCustomAspectSettings {idx}/>
                  </li>
               {/each}
            </ol>
         {/if}

         <!--Add Entry Button-->
         <div class="add-entry-button">
            <Button
               on:click={() => {
                  $document.system.addCustomAspect();
               }}
            >
               <!--Button Content-->
               <div class="button-content">
                  <!--Icon-->
                  <i class="{CREATE_ICON}"/>

                  <!--Label-->
                  <div class="label">
                     {localize('addCustomAspect')}
                  </div>
               </div>
            </Button>
         </div>
      </div>
   </ScrollingContainer>
</div>

<style lang="scss">
   .tab {
      @include flex-column;
      @include flex-group-top;

      width: 100%;
      height: 100%;

      .filter {
         @include flex-row;
         @include flex-group-center;

         width: 100%;
      }

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;

         width: 100%;
         height: 100%;

         ol {
            @include flex-column;
            @include flex-group-top;

            list-style: none;
            padding: 0;
            margin: 0;
            width: 100%;

            li {
               width: 100%;
               margin-top: var(--padding-large);
            }
         }

         .add-entry-button {
            @include flex-row;
            @include flex-group-center;

            width: 100%;
            margin-top: var(--padding-large);

            .button-content {
               @include flex-row;
               @include flex-group-center;

               i {
                  margin-right: var(--padding-standard);
               }
            }
         }
      }
   }
</style>
