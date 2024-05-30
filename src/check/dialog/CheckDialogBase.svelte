<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import {createEventDispatcher} from 'svelte';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';

   /** @type {*[]} Components for changing the options and displaying the parameters. */
   export let rows = void 0;

   const dispatcher = createEventDispatcher();
   const application = getApplication();

   // Rolls the check and closes the application
   /**
    *
    */
   function onRoll() {
      dispatcher('roll', {});
      application.close();
   }

   // Cancels the check and closes the application
   /**
    *
    */
   function onCancel() {
      application.close();
   }

</script>

<div class="check-dialog" on:change>
   <!--Fields-->
   {#each rows as row }
      <div class="row">
         <svelte:component
            this="{row}"
            on:change
         />
      </div>
   {/each}

   <!--Buttons-->
   <div class="row">
      <div class="button">
         <Button on:click={onRoll}>{localize('roll')}</Button>
      </div>

      <div class="button">
         <Button on:click={onCancel}>{localize('cancel')}</Button>
      </div>
   </div>
</div>

<style lang="scss">
   .check-dialog {
      @include flex-column;
      @include font-size-normal;

      justify-items: flex-end;

      .row {
         @include flex-row;
         @include flex-group-center;

         height: 100%;
         width: 100%;

         &:not(:first-child) {
            border-top: solid;
            padding-top: var(--titan-padding-standard);
            margin-top: var(--titan-padding-standard);
            border-width: var(--titan-border-width);
         }

         .button {
            @include flex-row;

            width: 100%;
            margin-top: var(--titan-padding-large);

            &:not(:first-child) {
               margin-left: var(--titan-padding-standard);
            }
         }
      }
   }
</style>
