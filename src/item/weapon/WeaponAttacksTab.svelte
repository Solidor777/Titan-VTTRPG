<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import AttackSheetVertical from "./AttackSheetVertical.svelte";

   // Reference to the weapon item
   const document = getContext("DocumentSheetObject");

   // Initialize collapsed state
   const application = getContext("external").application;
</script>

<div class="weapon-attacks-tab">
   <div class="scrolling-content">
      <ScrollingContainer>
         <ol class="attack-list">
            <!--For Each attack-->
            {#each Object.entries($document.system.attack) as [attackIdx, attack]}
               <li transition:slide|local>
                  <AttackSheetVertical {attackIdx} bind:isCollapsedObject={application.isCollapsed.attacks.attack} />
               </li>
            {/each}
         </ol></ScrollingContainer
      >
   </div>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .weapon-attacks-tab {
      @include flex-column;
      @include flex-group-center;
      height: 100%;
      width: 100%;

      .scrolling-content {
         height: 100%;
         width: 100%;
      }
   }
</style>
