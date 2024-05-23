<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import { CHECKED_ICON, MULTI_ATTACK_ICON, NO_MULTI_ATTCK_ICON, UNCHECKED_ICON } from '~/system/Icons.js';

   // Item Reference
   export let item = void 0;
   // Reference to the application
   const document = getContext('document');
</script>

<Button on:click={() => $document.system.toggleMultiAttack(item._id)}>
   <div class="button-inner">
      <i class={item.system.multiAttack ? MULTI_ATTACK_ICON : NO_MULTI_ATTCK_ICON}/>
      <div class="label">
         {localize('multiAttack')}
      </div>
      <i
         class={item.system.multiAttack
            ? CHECKED_ICON
            : UNCHECKED_ICON}
      />
   </div>
</Button>

<style lang="scss">
   .button-inner {
      @include flex-row;
      @include flex-group-center;

      height: 100%;

      :not(:first-child) {
         margin-left: var(--padding-standard);
      }
   }
</style>
