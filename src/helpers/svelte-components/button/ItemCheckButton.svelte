<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import {DICE_ICON, SPEND_RESOLVE_ICON} from '~/system/Icons.js';

   /** @type string The Label for the check. */
   export let label = void 0;

   /** @type string The Attribute to use for the check. */
   export let attribute = void 0;

   /** @type number The Resolve cost of rolling the check, if any. */
   export let resolveCost = void 0;

   /** @type boolean Whether the button should be disabled. */
   export let disabled = void 0;
</script>

<div class="item-check-button {attribute}">
   <Button {disabled} on:click>
      <div class="button-inner">
         <i class="{DICE_ICON}"/>
         <div>
            {label}
         </div>

         {#if resolveCost}
            <div class="resolve">
               <i class={SPEND_RESOLVE_ICON}/>
               <div>
                  {resolveCost}
               </div>
            </div>
         {/if}
      </div>
   </Button>
</div>

<style lang="scss">
   .item-check-button {
      @include flex-row;
      @include attribute-button;

      .button-inner {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;

         line-height: normal;
         padding: var(--titan-padding-standard);

         i {
            margin-right: var(--titan-padding-standard);
         }

         .resolve {
            @include border-left;
            @include flex-row;
            @include flex-group-center;

            border-color: var(--titan-button-border-color);
            margin-left: var(--titan-padding-standard);
            padding-left: var(--titan-padding-standard);
         }
      }
   }
</style>
