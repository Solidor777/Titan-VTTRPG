<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";

   // Application statee reference
   const document = getContext("DocumentStore");
   const application = getContext("external").application;
</script>

<div class="traits">
   <!--Edit Traits Button-->
   <div class="edit-traits-button">
      <EfxButton
         on:click={() => {
            application.editArmorTraits();
         }}
      >
         <div class="button-contents">
            <div class="label">
               {localize("editTraits")}
            </div>
            <i class="fas fa-circle-plus" />
         </div>
      </EfxButton>
   </div>

   <!--Traits-->
   <div class="traits-container" transition:slide|local>
      {#if $document.system.trait.length > 0}
         {#each $document.system.trait as trait (trait.name)}
            <div class="trait" transition:slide|local data-tooltip={localize(`${trait.name}.desc`)}>
               <Tag label={localize(trait.name)} />
            </div>
         {/each}
      {/if}
   </div>
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .traits {
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      height: 100%;

      .edit-traits-button {
         @include flex-row;
         @include flex-group-center;
         margin-top: 0.5rem;

         .button-contents {
            @include flex-row;
            @include flex-group-center;

            .label {
               @include flex-row;
               @include flex-group-center;
            }

            i {
               margin-left: 0.5rem;
            }
         }
      }
   }

   .traits-container {
      @include list;
      @include flex-row;
      @include flex-group-center;
      flex-wrap: wrap;

      .trait {
         @include flex-row;
         @include flex-group-center;
         @include tag-margin;
      }
   }
</style>
