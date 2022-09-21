<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import WeaponSheetAttackSettings from "./WeaponSheetAttackSettings.svelte";

   // Setup context variables
   const application = getContext("external").application;
   const document = getContext("DocumentStore");
   const appState = getContext("ApplicationStateStore");

   $document.system.attack.forEach((attack, idx) => {
      $appState.isExpanded.attack[idx] = $appState.isExpanded.attack[idx] ?? true;
   });
</script>

<div class="tab">
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.attacks}>
      <div class="scrolling-content">
         <!--Attacks List-->
         {#if $document.system.attack.length > 0}
            <ol>
               <!--Each attack-->
               {#each Object.entries($document.system.attack) as [idx]}
                  <li in:slide>
                     <WeaponSheetAttackSettings {idx} />
                  </li>
               {/each}
            </ol>
         {/if}

         <!--Add Attack Button-->
         <div class="add-attack-button">
            <EfxButton
               on:click={() => {
                  application.addAttack();
               }}
            >
               <!--Button Content-->
               <div class="button-content">
                  <!--Label-->
                  <div class="label">
                     {localize("addAttack")}
                  </div>

                  <!--Icon-->
                  <i class="fas fa-circle-plus" />
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
      @include flex-group-center;
      @include flex-row;
      height: 100%;
      width: 100%;
      font-size: 1rem;

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

         .add-attack-button {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            margin-top: 0.5rem;

            .button-content {
               @include flex-row;
               @include flex-group-center;

               i {
                  margin-left: 0.25rem;
               }
            }
         }
      }
   }
</style>
