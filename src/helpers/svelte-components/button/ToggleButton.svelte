<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import {CHECKED_ICON, UNCHECKED_ICON} from '~/system/Icons.js';

   export let label = void 0;
   export let active = void 0;
</script>

<Button on:click>
   <div class="button-inner">
      <div class="label">
         {label}
      </div>
      <i class={active ? CHECKED_ICON: UNCHECKED_ICON}/>
   </div>
</Button>

<style lang="scss">
   .button-inner {
      @include flex-row;
      @include flex-group-center;

      height: 100%;

      :not(:first-child) {
         margin-left: var(--titan-padding-standard);
      }
   }
</style>
