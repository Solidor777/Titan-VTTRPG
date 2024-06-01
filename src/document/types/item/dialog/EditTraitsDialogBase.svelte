<svelte:options accessors={true}/>

<script>
   import getApplication from '~/helpers/utility-functions/GetApplication';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';

   /** @type TitanItem The Item to edit the Traits of. */
   export let item = void 0;

   /** @type object[] The traits to be edited. */
   export let documentTraits = void 0;

   /** @type object[] The traits to select from. */
   export let traitOptions = void 0;

   /** @type object Object containing a mapping of each trait to its description. */
   export let traitDescriptions = void 0;

   // Application reference
   const application = getApplication();

   // Initialize the value of each trait option to the current value of the document's matching trait
   for (const trait of documentTraits) {
      for (let idx = 0; idx < traitOptions.length; idx++) {
         if (traitOptions[idx].name === trait.name) {
            traitOptions[idx].value = trait.value;
            break;
         }
      }
   }

   /**
    * Applies the trait edits to the Document.
    */
   function applyTraitEdits() {
      // If the document and traits are still valid
      if (item && documentTraits) {

         // Set the document's traits to equal the active traits from the trait options
         documentTraits = traitOptions.filter((trait) =>
            (trait.type === 'boolean' && trait.value === true) ||
            (trait.type === 'number' && trait.value > 0),
         );

         // Update the document
         item.update({
            system: item.system
         });
      }

      application.close();
   }
</script>

<!--Traits list-->
<ol>
   {#each traitOptions as trait, idx}
      <!--Trait-->
      <li use:tooltip={{ content: localize(traitDescriptions[trait.name]) }}>

         <!--Label-->
         <div class="label">
            {localize(trait.name)}
         </div>

         <!--Input-->
         <div class="input">
            {#if trait.type === 'boolean'}
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
      <Button on:click={() => applyTraitEdits()}>
         {localize('applyEdits')}
      </Button>
   </div>

   <!--Cancel Button-->
   <div class="button">
      <Button on:click={() => application.close()}>
         {localize('cancel')}
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

         width: 100%;
         height: 40px;
         margin-bottom: var(--titan-padding-large);
         padding: var(--titan-padding-standard);

         @include font-size-normal;

         font-weight: bold;
         page-break-inside: avoid;

         &:not(:first-child) {
            margin-top: var(--titan-padding-large);
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
      margin-top: var(--titan-padding-standard);

      .button {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         --titan-button-border-radius: var(--titan-button-chat-message-border-radius);

         &:not(:first-child) {
            margin-left: var(--titan-padding-standard);
         }
      }
   }
</style>
