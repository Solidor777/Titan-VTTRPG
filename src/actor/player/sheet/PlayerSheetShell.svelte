<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

   // Setup
   export let elementRoot;
   export let storeDoc;
   setContext("DocumentSheetObject", storeDoc);
   const document = getContext("DocumentSheetObject");

   import TextInput from "../../../documents/components/TextInput.svelte";
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
            <!--Exp-->
            <div class="exp">
               <!--Available-->
               <div class="available">
                  {$document.system.exp.available} /
               </div>

               <!--Earned Input-->
               <div class="earned">
                  <TextInput bind:value={$document.system.exp.earned} />
               </div>

               <!--Label-->
               <div>
                  <div class="label">{localize("LOCAL.exp")}</div>
               </div>
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
         border: solid;
         border-radius: 10px;
         margin-right: 0.5rem;
         padding: 0.5rem;
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
            border: solid;
            border-radius: 10px;
            padding: 0.5rem;

            .actor-name {
               font-size: 1.6rem;
               height: 2rem;
               width: 50%;
            }

            .exp {
               margin-right: 1rem;
               display: flex;
               width: 6rem;
               align-items: center;
               text-align: center;
               justify-content: flex-end;

               .available {
                  display: flex;
                  font-weight: bold;
                  margin-right: 0.25rem;
                  font-size: 1.1rem;
               }

               .earned {
                  display: flex;
                  margin-right: 0.5rem;
                  width: 2rem;
               }

               .label {
                  font-weight: bold;
               }
            }
         }
      }
   }
</style>
