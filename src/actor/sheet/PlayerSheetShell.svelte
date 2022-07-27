<svelte:options accessors={true} />

<script>
   // Svelte and document setup
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   export let elementRoot;
   export let storeDoc;
   setContext("DocumentSheetObject", storeDoc);
   const document = getContext("DocumentSheetObject");

   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import TextInput from "../../documents/components/TextInput.svelte";
   console.log($document);
</script>

<ApplicationShell bind:elementRoot>
   <!--Sheet-->
   <form class="player-sheet">
      <!--Sidebar-->
      <div class="sidebar" />
      <!--Main Sheet-->
      <div class="main">
         <!--Header -->
         <div class="header">
            <!--Actor name Sheet-->
            <div class="actor-name">
               <TextInput bind:value={$document.name} />
            </div>
            <div class="exp">
               <TextInput bind:value={$document.system.exp.earned} />
               {$document.system.exp.available}
            </div>
         </div>
         <!--Tab Content-->
         <div class="tab-content" />
      </div>
   </form>
</ApplicationShell>

<style lang="scss">
   .player-sheet {
      display: flex;
      flex: 1;

      .sidebar {
         width: 12rem;
         min-width: 10rem;
         height: 100%;
      }

      .main {
         display: flex;
         flex: 1;
         .header {
            display: flex;
            width: 100%;
            height: 4rem;
            align-items: center;
            justify-content: space-between;

            .actor-name {
               font-size: 1.6rem;
               height: 2rem;
               width: 50%;
            }
         }
      }
   }
</style>
