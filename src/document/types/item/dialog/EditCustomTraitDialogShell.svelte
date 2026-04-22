<svelte:options accessors={true}/>

<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import TextArea from '~/helpers/svelte-components/input/TextAreaInput.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   /** @type {TitanItem} The item owning the custom trait being edited. */
   export let item = void 0;

   /** @type {SvelteApp} The Svelte Component's Application. */
   const application = getApplication();

   /** @type {number} The index of the trait in the item's custom traits array. */
   export let traitIdx = void 0;

   /** @type {object} The custom trait being edited. */
   const trait = item.system.customTrait[traitIdx];

   /**
    * Saves the edited trait and closes the dialog.
    * @returns {void}
    */
   function editTrait() {
      const customTrait = item.system.customTrait;

      if (customTrait && customTrait[traitIdx]) {
         customTrait[traitIdx] = trait;

         item.update({
            system: {
               customTrait: structuredClone(customTrait),
            },
         });
      }

      application.close();
   }
</script>

<div class="custom-trait-dialog">
   <!--Name-->
   <div class="name">
      <!--Label-->
      <div class="label">
         {localize('name')}
      </div>

      <!--Input-->
      <div class="input">
         <TextInput bind:value={trait.name}/>
      </div>
   </div>

   <!--Description-->
   <div class="description">
      <!--Label-->
      <div class="label">
         {localize('description')}
      </div>

      <!--Input-->
      <div class="input">
         <TextArea bind:value={trait.description}/>
      </div>
   </div>

   <!--Buttons-->
   <div class="buttons">
      <!--Add Trait Button-->
      <div class="button">
         <Button
            on:click={() => {
               editTrait();
            }}
         >
            {localize('applyEdits')}
         </Button>
      </div>

      <!--Cancel Button-->
      <div class="button">
         <Button
            on:click={() => {
               application.close();
            }}
         >
            {localize('cancel')}
         </Button>
      </div>
   </div>
</div>

<style lang="scss">
   .custom-trait-dialog {
      @include font-size-normal;
      @include flex-column;

      width: 100%;
      height: 248px;

      .name {
         @include flex-row;
         @include flex-group-left;

         .label {
            @include flex-row;

            font-weight: bold;
         }

         .input {
            @include flex-row;

            height: 100%;
            width: 100%;

            @include margin-left-standard;
         }
      }

      .description {
         @include flex-column;
         @include flex-group-top;

         width: 100%;
         height: 100%;

         @include margin-top-standard;

         .label {
            @include flex-row;
            @include flex-group-center;

            font-weight: bold;
         }

         .input {
            @include flex-column;
            @include flex-group-top;

            width: 100%;
            height: 100%;

            @include margin-top-standard;
         }
      }

      .buttons {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         @include margin-top-standard;

         .button {
            @include flex-row;

            width: 100%;

            --titan-button-border-radius: var(--titan-button-border-radius);

            &:not(:first-child) {
               @include margin-left-standard;
            }
         }
      }
   }
</style>
