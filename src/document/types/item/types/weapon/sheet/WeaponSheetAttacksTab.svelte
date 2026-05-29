<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import DocumentOwnerButton from '~/document/svelte-components/DocumentOwnerButton.svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/input/TopFilter.svelte';
   import WeaponSheetAttackSettings from '~/document/types/item/types/weapon/sheet/WeaponSheetAttackSettings.svelte';
   import { CREATE_ICON } from '~/system/Icons.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {number[]} The filtered list of attack indices to display. */
   let filteredEntries = [];
   $: {
      filteredEntries = [];
      $document.system.attack.forEach((entry, idx) => {
         if (
            entry.label
               .toLowerCase()
               .indexOf($appState.tabs.attacks.filter.toLowerCase()) !== -1
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
         <TopFilter bind:value={$appState.tabs.attacks.filter}/>
      </div>
   {/if}

   <!--Scrolling Content-->
   <ScrollingContainer bind:scrollTop={$appState.tabs.attacks.scrollTop}>
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
            <DocumentOwnerButton
               onclick={() => {
                  $document.system.addAttack();
               }}
            >
               <!--Button Content-->
               <div class="button-content">
                  <!--Icon-->
                  <i class={CREATE_ICON}/>

                  <!--Label-->
                  <div class="label">
                     <Text text="addAttack"/>
                  </div>
               </div>
            </DocumentOwnerButton>
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

               @include margin-top-large;
            }
         }

         .add-entry-button {
            @include flex-row;
            @include flex-group-center;

            width: 100%;

            @include margin-top-large;

            .button-content {
               @include flex-row;
               @include flex-group-center;

               i {
                  @include margin-right-standard;
               }
            }
         }
      }
   }
</style>
