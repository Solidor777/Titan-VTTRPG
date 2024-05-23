<svelte:options accessors={true}/>

<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import getApplication from '~/helpers/utility-functions/GetApplication';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import TextArea from '~/helpers/svelte-components/input/TextArea.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import createCustomItemTraitTemplate from '~/document/types/item/CustomItemTrait.js';

   // The document owning the trait
   export let document = void 0;

   // Application reference
   const application = getApplication();

   const newTrait = createCustomItemTraitTemplate();

   /**
    *
    */
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

<div class="custom-trait-dialog">
   <!--Name-->
   <div class="name">
      <!--Label-->
      <div class="label">
         {localize('name')}
      </div>

      <!--Input-->
      <div class="input">
         <TextInput bind:value={newTrait.name}/>
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
         <TextArea bind:value={newTrait.description}/>
      </div>
   </div>

   <!--Buttons-->
   <div class="buttons">
      <!--Add Trait Button-->
      <div class="button">
         <Button
            on:click={() => {
               addTrait();
            }}
         >
            {localize('addTrait')}
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
            margin-left: var(--padding-standard);
         }
      }

      .description {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         height: 100%;
         margin-top: var(--padding-standard);

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
            margin-top: var(--padding-standard);
         }
      }

      .buttons {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
         margin-top: var(--padding-standard);

         .button {
            @include flex-row;
            width: 100%;
            --button-border-radius: var(--button-chat-message-border-radius);

            &:not(:first-child) {
               margin-left: var(--padding-standard);
            }
         }
      }
   }
</style>
