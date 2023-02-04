<svelte:options accessors={true} />

<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import { v4 as uuidv4 } from 'uuid';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import TextArea from '~/helpers/svelte-components/input/TextArea.svelte';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   // The document document owning the trait
   export let document = void 0;

   // Application reference
   const application = getContext('external').application;

   const newTrait = {
      name: localize('newTrait'),
      description: '',
      uuid: uuidv4(),
   };

   function addTrait() {
      const customTrait = document.system.customTrait;

      if (customTrait) {
         customTrait.push(newTrait);

         document.update({
            system: {
               customTrait: customTrait,
            },
         });
      }

      application.close();
   }
</script>

<div class="add-custom-trait-dialog">
   <!--Name-->
   <div class="name">
      <!--Label-->
      <div class="label">
         {localize('name')}
      </div>

      <!--Input-->
      <div class="input">
         <TextInput bind:value={newTrait.name} />
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
         <TextArea bind:value={newTrait.description} />
      </div>
   </div>

   <!--Buttons-->
   <div class="buttons">
      <!--Add Trait Button-->
      <div class="button">
         <EfxButton
            on:click={() => {
               addTrait();
            }}
         >
            {localize('addTrait')}
         </EfxButton>
      </div>

      <!--Cancel Button-->
      <div class="button">
         <EfxButton
            on:click={() => {
               application.close();
            }}
         >
            {localize('cancel')}
         </EfxButton>
      </div>
   </div>
</div>

<style lang="scss">
   @import '../Styles/Mixins.scss';

   .add-custom-trait-dialog {
      @include flex-column;
      @include flex-group-top;
      @include font-size-normal;
      width: 100%;
      height: 100%;

      .name {
         @include flex-row;
         @include flex-group-left;
         width: 100%;

         .label {
            @include flex-row;
            @include flex-group-left;
            height: 100%;
            font-weight: bold;
         }

         .input {
            @include flex-row;
            @include flex-group-left;
            height: 100%;
            width: 100%;
            margin-left: 0.25rem;
         }
      }

      .description {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         height: 100%;
         margin-top: 0.25rem;

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
            margin-top: 0.25rem;
         }
      }

      .buttons {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
         margin-top: 0.25rem;

         .button {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            --button-border-radius: 10px;
            &:not(:first-child) {
               margin-left: 0.25rem;
            }
         }
      }
   }
</style>
