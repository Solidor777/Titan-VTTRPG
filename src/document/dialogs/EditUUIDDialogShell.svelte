<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import getApplication from '~/helpers/utility-functions/GetApplication';
   import TextArea from '~/helpers/svelte-components/input/TextArea.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   // document to edit the UUID for
   export let document = void 0;

   // UUID of the document
   let uuid = document.flags?.titan?.uuid;

   // Application reference
   const application = getApplication();

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
      ui.notifications.info(
         localize('editedUUIDForDocumentX%').replace('X%', document.name),
      );
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
      <img src={document.img} alt={document.img}/>

      <!--Name-->
      <div class="name">
         {document.name}
      </div>
   </div>

   <div class="section">
      {@html localize('editUUID.desc')}
   </div>

   <!--UUID-->
   <div class="input">
      <TextArea bind:value={uuid}/>
   </div>

   <!--Buttons-->
   <div class="buttons">
      <div class="button">
         <Button on:click={onApplyEdits}>
            {localize('applyEdits')}
         </Button>
      </div>

      <div class="button">
         <Button on:click={onCancel}>{localize('cancel')}</Button>
      </div>
   </div>
</div>

<style lang="scss">
   .edit-uuid-dialog {
      @include flex-column;
      @include font-size-normal;
      justify-items: flex-end;

      .header {
         @include flex-row;
         @include flex-group-center;

         img {
            width: 80px;
            border: none;
         }

         .name {
            @include font-size-large;
            margin-left: var(--padding-large);
         }
      }

      .section {
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
            margin-top: var(--padding-large);

            &:not(:first-child) {
               margin-left: var(--padding-standard);
            }
         }
      }
   }
</style>
