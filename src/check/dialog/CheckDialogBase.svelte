<script>
   import Text from '~/helpers/svelte-components/Text.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';

   /**
    * @typedef {object} CheckDialogBaseProps
    * @property {Array<typeof import('svelte').SvelteComponent>} [rows] Components for changing the options and displaying the parameters.
    * @property {Function} [onroll] Callback invoked when the Roll button is clicked.
    */

   /** @type {CheckDialogBaseProps} */
   const {
      rows = undefined,
      onroll = undefined,
   } = $props();

   /** @type {SvelteApp} The Svelte Component's Application. */
   const application = getApplication();

   /**
    * Rolls the check and closes the application.
    */
   function onRoll() {
      onroll?.();
      application.close();
   }

   /**
    * Cancels the check and closes the application.
    */
   function onCancel() {
      application.close();
   }

</script>

<div class="check-dialog">
   <!--Fields-->
   {#each rows as Row}
      <div class="row">
         <Row/>
      </div>
   {/each}

   <!--Buttons-->
   <div class="row">
      <div class="button">
         <Button onclick={onRoll}><Text text="roll"/></Button>
      </div>

      <div class="button">
         <Button onclick={onCancel}><Text text="cancel"/></Button>
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

            @include padding-top-standard;
            @include margin-top-standard;

            border-width: var(--titan-border-width);
         }

         .button {
            @include flex-row;

            width: 100%;

            @include margin-top-large;

            &:not(:first-child) {
               @include margin-left-standard;
            }
         }
      }
   }
</style>
