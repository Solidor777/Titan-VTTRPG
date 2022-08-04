<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import HeaderWithScrollingSidebar from "~/helpers/svelte-components/HeaderWithScrollingSidebar.svelte";

   // Setup
   export let elementRoot;
   export let storeDoc;
   setContext("DocumentSheetObject", storeDoc);
   const document = getContext("DocumentSheetObject");
</script>

<ApplicationShell bind:elementRoot>
   <div class="weapon-sheet">
      <HeaderWithScrollingSidebar>
         <div slot="sidebar">Weapon Sidebar</div>
         <div slot="header">Weapon Header</div>
         <div slot="content">Weapon Content</div>
      </HeaderWithScrollingSidebar>
   </div>
</ApplicationShell>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .weapon-sheet {
      --sidebar-width: 12rem;
      --header-height: 10rem;
   }
</style>
