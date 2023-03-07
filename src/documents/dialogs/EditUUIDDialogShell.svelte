<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import TextArea from '~/helpers/svelte-components/input/TextArea.svelte';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   // document to edit the UUID for
   export let document = void 0;

   // UUID of the document
   let uuid = document.flags?.titan?.uuid;

   // Application reference
   const application = getContext('#external').application;

   async function onApplyEdits() {
      if (document) {
         document.update({
            flags: {
               titan: {
                  uuid: uuid,
               },
            },
         });
      }
      application.close();
      return;
   }

   function onCancel() {
      application.close();
      return;
   }
</script>

<div class="edit-uuid-dialog">
   <!--Header-->
   <div class="header">
      <!--Image-->
      <img src={document.img} alt={document.img} />

      <!--Name-->
      <div class="name">
         {document.name}
      </div>
   </div>

   <div class="message">
      {@html localize('editUUID.desc')}
   </div>

   <!--UUID-->
   <div class="input">
      <TextArea bind:value={uuid} />
   </div>

   <!--Buttons-->
   <div class="buttons">
      <div class="button">
         <EfxButton on:click={onApplyEdits}>
            {localize('applyEdits')}
         </EfxButton>
      </div>

      <div class="button">
         <EfxButton on:click={onCancel}>{localize('cancel')}</EfxButton>
      </div>
   </div>
</div>

<style lang="scss">
   @import '../../styles/Mixins.scss';

   .edit-uuid-dialog {
      @include flex-column;
      @include font-size-normal;
      justify-items: flex-end;

      .header {
         @include flex-row;
         @include flex-group-center;

         img {
            width: 5rem;
            border: none;
         }

         .name {
            @include font-size-large;
            margin-left: 0.5rem;
         }
      }

      .message {
         @include flex-group-left;
      }

      .buttons {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         width: 100%;

         .button {
            @include flex-row;
            width: 100%;
            margin-top: 0.5rem;

            &:not(:first-child) {
               margin-left: 0.25rem;
            }
         }
      }
   }
</style>
