<script>
   import {getContext} from 'svelte';
   import {slide} from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/TopFilter.svelte';
   import WeaponSheetAttackSettings from '~/document/types/item/types/weapon/sheet/WeaponSheetAttackSettings.svelte';
   import {CREATE_ICON} from '~/system/Icons.js';

   // Setup context variables
   const document = getContext('document');
   const appState = getContext('applicationState');

   // Initialize expanded state
   $document.system.attack.forEach((entry, idx) => {
      $appState.isExpanded.attacks[idx] =
         $appState.isExpanded.attacks[idx] ?? true;
   });

   // Initialize filtered entries
   let filteredEntries = [];
   $: {
      filteredEntries = [];
      $document.system.attack.forEach((entry, idx) => {
         if (
            entry.label
               .toLowerCase()
               .indexOf($appState.filter.attacks.toLowerCase()) !== -1
         ) {
            filteredEntries.push(idx);
         }
      });
   }
</script>

<div class="tab">
   <!--Filter-->
   {#if $document.system.attack.length > 0}
      <div class="filter" transition:slide|local>
         <TopFilter bind:filter={$appState.filter.attacks}/>
      </div>
   {/if}

   <!--Scroling Content-->
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.attacks}>
      <div class="scrolling-content">
         <!--Attacks List-->
         {#if $document.system.attack.length > 0}
            <ol out:slide|local>
               <!--Each Attack-->
               {#each filteredEntries as idx ($document.system.attack[idx].uuid)}
                  <li out:slide|local>
                     <WeaponSheetAttackSettings {idx}/>
                  </li>
               {/each}
            </ol>
         {/if}

         <!--Add Attack Button-->
         <div class="add-entry-button">
            <Button
               on:click={() => {
                  $document.system.addAttack();
               }}
            >
               <!--Button Content-->
               <div class="button-content">
                  <!--Icon-->
                  <i class="{CREATE_ICON}"/>

                  <!--Label-->
                  <div class="label">
                     {localize('addAttack')}
                  </div>
               </div>
            </Button>
         </div>
      </div>
   </ScrollingContainer>
</div>

<!--For Each attack-->
<style lang="scss">
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

            width: 100%;

            li {
               @include flex-row;
               @include flex-group-center;

               width: 100%;
               margin-top: var(--titan-padding-large);
            }
         }

         .add-entry-button {
            @include flex-row;
            @include flex-group-center;

            width: 100%;
            margin-top: var(--titan-padding-large);

            .button-content {
               @include flex-row;
               @include flex-group-center;

               i {
                  margin-right: var(--titan-padding-standard);
               }
            }
         }
      }
   }
</style>
