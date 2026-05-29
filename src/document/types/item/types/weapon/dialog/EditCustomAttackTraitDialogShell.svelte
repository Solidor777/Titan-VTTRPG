<svelte:options accessors={true}/>

<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import TextArea from '~/helpers/svelte-components/input/TextAreaInput.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   // The weapon document owning the attack.
   /** @type {TitanItem|TitanActor} */
   export let document = void 0;

   // The attack idx.
   /** @type {number} */
   export let attackIdx = void 0;

   // The trait idx.
   /** @type {number} */
   export let traitIdx = void 0;

   /** @type {SvelteApp} The Svelte Component's Application. */
   const application = getApplication();

   const trait = document.system.attack[attackIdx].customTrait[traitIdx];

   /**
    * Saves the edited custom attack trait and closes the dialog.
    */
   function editTrait() {
      const attack = document.system.attack[attackIdx];

      if (attack && attack.customTrait[traitIdx]) {
         attack.customTrait[traitIdx] = trait;

         document.update({
            system: {
               attack: structuredClone(document.system.attack),
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
            onclick={() => {
               editTrait();
            }}
         >
            <Text text="applyEdits"/>
         </Button>
      </div>

      <!--Cancel Button-->
      <div class="button">
         <Button
            onclick={() => {
               application.close();
            }}
         >
            <Text text="cancel"/>
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
