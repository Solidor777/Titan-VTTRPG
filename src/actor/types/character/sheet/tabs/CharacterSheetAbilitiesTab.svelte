<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import ToggleOptionButton from "~/helpers/svelte-components/button/ToggleOptionButton.svelte";
   import TextInput from "~/helpers/svelte-components/input/TextInput.svelte";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import CharacterSheetItemList from "~/actor/types/character/sheet/items/CharacterSheetItemList.svelte";
   import CharacterSheetAbility from "~/actor/types/character/sheet/items/ability/CharacterSheetAbility.svelte";
   import CharacterSheetItemAddEntryButton from "~/actor/types/character/sheet/items/CharacterSheetItemAddEntryButton.svelte";

   // Application reference
   const appState = getContext("ApplicationStateStore");
</script>

<div class="tab">
   <!--Filter-->
   <div class="filter">
      <!--Options-->
      <div class="options">
         {#each Object.entries($appState.filterOptions.abilities) as [key]}
            <ToggleOptionButton label={localize(key)} bind:enabled={$appState.filterOptions.abilities[key]} />
         {/each}

         <!--Reset button-->
         <div class="reset">
            <IconButton
               icon="fas fa-rotate-left"
               on:click={() => {
                  $appState.filterOptions.abilities.passive = false;
                  $appState.filterOptions.abilities.reaction = false;
                  $appState.filterOptions.abilities.passive = false;
               }}
            />
         </div>
      </div>

      <!--Field-->
      <div class="field">
         <!--Label-->
         <div class="label">
            {localize("filter")}
         </div>

         <!--Input-->
         <div class="input">
            <TextInput bind:value={$appState.filter.inventory} />
         </div>
      </div>
   </div>

   <!--Scrolling Containers-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.abilities}>
         <!--Abilities List-->
         <div class="list">
            <CharacterSheetItemList
               itemComponent={CharacterSheetAbility}
               filterFunction={(item) => {
                  if (item.type !== "ability") {
                     return false;
                  }
                  if ($appState.filterOptions.abilities.action && !item.system.action) {
                     return false;
                  }

                  if ($appState.filterOptions.abilities.reaction && !item.system.reaction) {
                     return false;
                  }

                  if ($appState.filterOptions.abilities.passive && !item.system.passive) {
                     return false;
                  }

                  return true;
               }}
               filter={$appState.filter.abilities}
               isExpandedMap={$appState.isExpanded.abilities}
            />
         </div>

         <!--Add Spell Button-->
         <div class="add-entry-button">
            <CharacterSheetItemAddEntryButton itemType={"ability"} label={localize("addNewAbility")} />
         </div>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";
   .tab {
      @include flex-column;
      @include flex-group-top;
      @include panel-2;
      height: 100%;
      width: 100%;

      .filter {
         @include flex-column;
         @include flex-group-top;
         @include border-bottom;
         @include panel-1;
         width: 100%;
         padding-bottom: 0.25rem;

         .options {
            @include flex-row;
            @include flex-group-center;
            .reset {
               --icon-button-font-size: var(--font-size-small);
               --icon-button-radius: 1.75rem;
            }
         }

         .field {
            @include flex-row;
            @include flex-group-center;
            margin-top: 0.25rem;

            .label {
               font-weight: bold;
               margin: 0 0.25rem;
            }

            .input {
               @include flex-group-left;
            }
         }
      }

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         height: 100%;

         .list {
            @include flex-column;
            @include flex-group-top;
            width: 100%;
            margin-top: 0.5rem;
         }

         .add-entry-button {
            @include flex-row;
            @include flex-group-center;
            width: 100%;

            &:not(:first-child) {
               margin-top: 0.5rem;
            }
         }
      }
   }
</style>
