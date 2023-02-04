<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import { localize } from '~/helpers/Utility.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';
   import DeleteTag from '~/helpers/svelte-components/tag/DeleteTag.svelte';
   import DocumentAddCustomTraitDialog from '~/documents/DocumentAddCustomTraitDialog';

   // Application statee reference
   const document = getContext('DocumentStore');
</script>

<div class="traits">
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
               {localize('addCustomTrait')}
            </div>
         </div>
      </EfxButton>
   </div>

   <!--Traits-->
   {#if $document.system.customTrait.length > 0}
      <div class="traits-container" transition:slide|local>
         <!--Custom Traits-->
         {#each $document.system.customTrait as trait, idx (trait.uuid)}
            <div
               class="trait"
               use:tooltip={{ content: trait.description }}
               transition:slide|local
            >
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
                  label={trait.name}
               />
            </div>
         {/each}
      </div>
   {/if}
</div>

<style lang="scss">
   @import '../../Styles/Mixins.scss';

   .traits {
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      height: 100%;

      .button {
         @include flex-row;
         @include flex-group-center;

         margin-top: 0.5rem;
         --button-font-size: var(--font-size-small);
         --button-line-height: 1.25rem;

         &:not(:first-child) {
            margin-left: 0.25rem;
         }

         .button-contents {
            @include flex-row;
            @include flex-group-center;

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

      .trait {
         @include flex-row;
         @include flex-group-center;
         @include tag-margin;
         @include font-size-small;
      }
   }
</style>
