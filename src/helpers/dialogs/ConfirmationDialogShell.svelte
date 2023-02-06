<svelte:options accessors={true} />

<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   // Character Sheet
   export let headers = void 0;
   export let message = void 0;
   export let confirmLabel = void 0;

   const application = getContext('external').application;
</script>

<div class="add-item-dialog">
   <!--Headers-->
   {#each headers as header}
      <div class="header">
         {header}
      </div>
   {/each}

   <!--Message-->
   <div class="message">
      {message}
   </div>

   <!--Confirm Button-->
   <div class="button">
      <EfxButton
         on:click={() => {
            application.confirmed();
            if (typeof application.confirmationCallback === 'function') {
               application.confirmationCallback();
            }
            application.close();
         }}
      >
         {confirmLabel}
      </EfxButton>
   </div>

   <!--Cancel button-->
   <div class="button">
      <EfxButton
         on:click={() => {
            application.close();
         }}
         >{localize('cancel')}
      </EfxButton>
   </div>
</div>

<style lang="scss">
   @import '../../Styles/Mixins.scss';

   .add-item-dialog {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .header {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;

         width: 100%;
         font-weight: bold;
         flex-wrap: wrap;
      }

      .message {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;
         padding: 0.25rem;
      }

      .button {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
         margin-top: 0.25rem;
         --button-border-radius: 10px;
      }
   }
</style>
