<script>
   import { getContext } from 'svelte';
   import DocumentImagePicker from '~/document/svelte-components/input/DocumentImagePicker.svelte';
   import DocumentNameInput from '~/document/svelte-components/input/DocumentNameInput.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<!--Header-->
<div class="header">
   <!--Portrait-->
   <div class="portrait">
      <DocumentImagePicker alt={'item portrait'} bind:value={$document.img}/>
   </div>

   <!--Name and Stats-->
   <div class="label-stats">
      <div class="name">
         <DocumentNameInput/>
      </div>

      <!--Secondary Stats-->
      <div class="secondary-stats">
         <slot/>
      </div>
   </div>
</div>

<style lang="scss">
   .header {
      @include border;
      @include flex-row;
      @include flex-group-left;
      @include panel-1;

      width: 100%;
      padding: var(--titan-spacing-standard) var(--titan-spacing-large);

      .portrait {
         width: 80px;

         --titan-border-style: none;
      }

      .label-stats {
         @include flex-column;
         @include flex-group-top-left;

         width: calc(100% - 88px);
         margin-left: var(--titan-spacing-large);

         .name {
            @include flex-row;
            @include flex-group-left;

            width: 100%;
         }

         .secondary-stats {
            @include flex-row;
            @include flex-group-left;

            margin-top: var(--titan-spacing-large);
            width: 100%;

            :global(.stat) {
               @include flex-row;
               @include flex-group-left;
            }

            :global(.stat:not(:first-child)) {
               @include border-left;

               margin-left: var(--titan-spacing-large);
               padding-left: var(--titan-spacing-large);
            }

            :global(.stat i) {
               margin-right: var(--titan-spacing-standard);
            }

            :global(.stat .label) {
               @include flex-row;
               @include flex-group-left;

               font-weight: bold;
               margin-right: var(--titan-spacing-standard);
            }

            :global(.stat .input) {
               @include flex-row;
               @include flex-group-center;
            }

            :global(.stat .input.number) {
               --titan-input-width: 32px;
            }

            :global(.stat .input.large-number) {
               --titan-input-width: 80px;
            }

            :global(.stat .divider) {
               margin-left: var(--titan-spacing-standard);
               margin-right: var(--titan-spacing-standard);
            }

            :global(.stat.text) {
               flex: 1;
               width: 100%;
            }

            :global(.stat.text .input) {
               width: 100%;
            }
         }
      }
   }
</style>
