<script>
   import { getContext } from 'svelte';

   // Document reference
   const document = getContext('DocumentStore');
   const chatContext = $document.flags.titan;

   export let icon = void 0;
   export let label = void 0;
   export let img1;
   export let img2;
   export let name1;
   export let name2;
</script>

<div class="header">
   <!--Images-->
   <div class="images">
      <img src={img1} alt="img1" />
      <img src={img2} alt="img2" />
   </div>

   <!--Header-->
   <div class="label">
      <!--Sub Headers-->
      <div class="name">
         {name1}
      </div>
      <div class="name">
         {name2}
      </div>

      <!--Main Header-->
      <div class="main">
         <!--Icon-->
         <i class={icon} />
         {label}
      </div>
   </div>
</div>

<style lang="scss">
   @import '../../../styles/Mixins.scss';

   .header {
      @include flex-column;
      @include flex-group-top;
      @include font-size-normal;
      width: 100%;
      font-weight: bold;

      img {
         @include panel-1;
         @include border;
         width: 5rem;
         margin-bottom: 0.5rem;

         &:not(:first-child) {
            margin-left: 0.25rem;
         }
      }

      .label {
         @include flex-column;
         @include flex-group-top;
         @include panel-1;
         @include border;
         width: 100%;
         padding: 0.25rem;

         .main {
            @include flex-row;
            @include flex-group-center;
            @include font-size-large;
            width: 100%;
            margin: 0.25rem 0 0.25rem;
            flex-wrap: wrap;

            i {
               margin-right: 0.25rem;
            }
         }

         .name {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            flex-wrap: wrap;

            &:not(:first-child) {
               margin-top: 0.25rem;
            }
         }
      }
   }
</style>
