<svelte:options accessors={true}/>

<script>
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';

   /**
    * @typedef {object} EditTraitsDialogBaseProps
    * @property {Item} [item] The Item to edit the Traits of.
    * @property {object[]} [documentTraits] The traits to be edited.
    * @property {object[]} [traitOptions] The traits to select from.
    * @property {object} [traitDescriptions] Object containing a mapping of each trait to its description.
    */

   /** @type {EditTraitsDialogBaseProps} */
   let {
      item = undefined,
      documentTraits = $bindable(undefined),
      traitOptions = $bindable(undefined),
      traitDescriptions = undefined,
   } = $props();

   /** @type {SvelteApp} The Svelte Component's Application. */
   const application = getApplication();

   // Initialize the value of each trait option to the current value of the
   // document's matching trait.
   if (documentTraits && traitOptions) {
      for (const trait of documentTraits) {
         for (let idx = 0; idx < traitOptions.length; idx++) {
            if (traitOptions[idx].name === trait.name) {
               traitOptions[idx].value = trait.value;
               break;
            }
         }
      }
   }

   /**
    * Applies the trait edits to the Document.
    */
   function applyTraitEdits() {
      // If the document and traits are still valid.
      if (item && documentTraits) {

         // Set the document's traits to equal the active traits from the trait options.
         documentTraits = traitOptions.filter((trait) =>
            (typeof (trait.value) === 'boolean' && trait.value === true) ||
            (typeof (trait.value) === 'number' && trait.value > 0),
         );

         // Update the document.
         item.update({
            system: structuredClone(item.system),
         });
      }

      application.close();
   }
</script>

<!--Traits list-->
<ol>
   {#each traitOptions as trait, idx}
      <!--Trait-->
      <li use:tooltipAction={traitDescriptions?.[trait.name]}>

         <!--Label-->
         <div class="label">
            {localize(trait.name)}
         </div>

         <!--Input-->
         <div class="input">
            {#if typeof (trait.value) === 'boolean'}
               <!--Boolean Trait-->
               <CheckboxInput bind:value={traitOptions[idx].value}/>
            {:else}
               <!--Integer Trait-->
               <IntegerInput bind:value={traitOptions[idx].value}/>
            {/if}
         </div>
      </li>
   {/each}
</ol>

<!--Buttons-->
<div class="buttons">

   <!--Apply Trait Edits Button-->
   <div class="button">
      <Button onclick={() => applyTraitEdits()}>
         <Text text="applyEdits"/>
      </Button>
   </div>

   <!--Cancel Button-->
   <div class="button">
      <Button onclick={() => application.close()}>
         <Text text="cancel"/>
      </Button>
   </div>
</div>

<style lang="scss">
   ol {
      list-style: none;
      column-count: var(--trait-column-count);
      margin: 0;
      padding: 0;

      li {
         @include border;
         @include flex-row;
         @include flex-group-center;
         @include panel-2;
         @include padding-standard;
         @include font-size-normal;

         width: 100%;
         height: 40px;

         @include margin-bottom-large;

         font-weight: bold;
         break-inside: avoid;

         &:not(:first-child) {
            @include margin-top-large;
         }

         .label {
            @include flex-row;
            @include flex-group-left;

            width: 100%;
            height: 100%;
         }

         .input {
            @include flex-row;
            @include flex-group-center;

            width: 30%;
            height: 100%;
         }
      }
   }

   .buttons {
      @include flex-row;
      @include flex-group-center;

      width: 100%;

      @include margin-top-standard;

      .button {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         --titan-button-border-radius: var(--titan-button-border-radius);

         &:not(:first-child) {
            @include margin-left-standard;
         }
      }
   }
</style>
