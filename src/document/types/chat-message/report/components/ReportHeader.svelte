<script>
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * @typedef {object} ReportHeaderProps
    * @property {string} [icon] The icon class to display in the header.
    * @property {string} [label] The localized label to display in the header.
    */

   /** @type {ReportHeaderProps} */
   const { icon = void 0, label = void 0 } = $props();
</script>

<div class="header">
   <!--Img-->
   <img alt="img" src={$document.flags.titan.img}/>

   <!--Header-->
   <div class="label">
      <!--Sub Header-->
      <div class="name">
         {$document.flags.titan.name}
      </div>

      <!--Main Header-->
      <div class="main">
         <!--Icon-->
         <i class={icon}/>
         {label}
      </div>
   </div>
</div>

<style lang="scss">
   .header {
      @include flex-column;
      @include flex-group-top;
      @include font-size-normal;

      width: 100%;
      font-weight: bold;

      img {
         @include panel-1;
         @include border;

         width: 80px;

         @include margin-bottom-large;
      }

      .label {
         @include flex-column;
         @include flex-group-top;
         @include panel-1;
         @include border;

         width: 100%;

         @include padding-large;

         .main {
            @include flex-row;
            @include flex-group-center;
            @include font-size-large;

            width: 100%;
            margin: var(--titan-spacing-standard) 0 var(--titan-spacing-standard);
            flex-wrap: wrap;

            i {
               @include margin-right-standard;
            }
         }

         .name {
            @include flex-row;
            @include flex-group-center;

            width: 100%;
            flex-wrap: wrap;
         }
      }
   }
</style>
