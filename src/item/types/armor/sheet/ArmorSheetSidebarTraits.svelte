<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";
   import DeleteTag from "~/helpers/svelte-components/tag/DeleteTag.svelte";
   import DocumentAddCustomTraitDialog from "~/documents/DocumentAddCustomTraitDialog";

   // Application statee reference
   const document = getContext("DocumentStore");
   const application = getContext("external").application;
</script>

<div class="traits">
   <!--Edit Traits Button-->
   <div class="button">
      <EfxButton
         on:click={() => {
            application.editArmorTraits();
         }}
      >
         <div class="button-contents">
            <i class="fas fa-pen-to-square" />
            <div class="label">
               {localize("editTraits")}
            </div>
         </div>
      </EfxButton>
   </div>

   <!--Add Custom Trait Button-->
   <div class="button">
      <EfxButton
         on:click={() => {
            const dialog = new DocumentAddCustomTraitDialog($document);
            dialog.render(true);
         }}
      >
         <div class="button-contents">
            <i class="fas fa-circle-plus" />
            <div class="label">
               {localize("addCustomTrait")}
            </div>
         </div>
      </EfxButton>
   </div>

   <!--Traits-->
   <div class="traits-container" transition:slide|local>
      {#if $document.system.trait.length > 0 || $document.system.customTrait.length > 0}
         {#each $document.system.trait as trait (trait.name)}
            <div class="trait" transition:slide|local data-tooltip={localize(`${trait.name}.desc`)}>
               <Tag label={localize(trait.name)} />
            </div>
         {/each}

         <!--Custom Traits-->
         {#each $document.system.customTrait as trait, idx (trait.uuid)}
            <div class="trait" data-tooltip={trait.description} transition:slide|local>
               <DeleteTag
                  deleteFunction={() => {
                     const customTrait = $document.system.customTrait;
                     customTrait.splice(idx, 1);

                     $document.update({
                        system: {
                           customTrait: customTrait,
                        },
                     });
                  }}
                  <Tag
                  label={trait.name}
               />
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

      .button {
         @include flex-row;
         @include flex-group-center;
         @include z-index-app;
         margin-top: 0.5rem;
         --button-font-size: var(--font-size-small);
         --button-line-height: 1.25rem;

         &:not(:first-child) {
            margin-left: 0.25rem;
         }

         .button-contents {
            @include flex-row;
            @include flex-group-center;
            @include z-index-app;

            .label {
               @include flex-row;
               @include flex-group-center;
            }

            i {
               margin-right: 0.25rem;
            }
         }
      }
   }

   .traits-container {
      @include list;
      @include flex-row;
      @include flex-group-center;
      flex-wrap: wrap;
      @include z-index-app;

      .trait {
         @include flex-row;
         @include flex-group-center;
         @include tag-margin;
         @include font-size-small;
         @include z-index-app;
      }
   }
</style>
