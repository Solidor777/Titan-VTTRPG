<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";

   // Application statee reference
   const appState = getContext("ApplicationStateStore");
   const document = getContext("DocumentStore");
</script>

<!--Casting Check-->
<div class="casting-check {$document.system.castingCheck.attribute}">
   <!--Label-->
   <div class="label">
      {localize($document.system.castingCheck.attribute)} ({localize($document.system.castingCheck.skill)}) {$document
         .system.castingCheck.difficulty}:{$document.system.castingCheck.complexity}
   </div>

   {#if $document.aspect && $document.aspect.length > 0}
      <!--Expand button-->
      <div class="expand-button" transition:slide|local>
         {#if $appState.isExpanded.sidebar.castingCheck}
            <!--Collapse button-->
            <IconButton
               icon="fas fa-angle-double-down"
               on:click={() => {
                  $appState.isExpanded.sidebar.castingCheck = false;
               }}
            />
         {:else}
            <!--Expand button-->
            <IconButton
               icon="fas fa-angle-double-left"
               on:click={() => {
                  $appState.isExpanded.sidebar.castingCheck = true;
               }}
            />
         {/if}
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";
   .casting-check {
      @include flex-row;
      @include flex-group-center;
      @include border-top-bottom;
      border-radius: 0;
      padding: 0.5rem;
      font-weight: bold;
      width: 100%;
      margin-top: 0.5rem;

      &.body {
         background: var(--body-color-bright);
      }

      &.mind {
         background: var(--mind-color-bright);
      }

      &.soul {
         background: var(--soul-color-bright);
      }
   }
</style>
