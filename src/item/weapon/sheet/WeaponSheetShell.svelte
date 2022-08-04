<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import HeaderWithSidebar from "~/helpers/svelte-components/HeaderWithSidebar.svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";

   // Setup
   export let elementRoot;
   export let storeDoc;
   setContext("DocumentSheetObject", storeDoc);
   const document = getContext("DocumentSheetObject");
</script>

<ApplicationShell bind:elementRoot>
   <div class="weapon-sheet">
      <HeaderWithSidebar>
         <div slot="sidebar">
            <ScrollingContainer>Weapon Sidebar</ScrollingContainer>
         </div>
         <div slot="header">Weapon Header</div>
         <div slot="content">Weapon Content</div>
      </HeaderWithSidebar>
   </div>
</ApplicationShell>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .weapon-sheet {
      --sidebar-width: 12rem;
      --header-height: 10rem;
   }
</style>
