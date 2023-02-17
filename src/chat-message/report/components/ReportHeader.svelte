<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/utility';

   // Document reference
   const document = getContext('DocumentStore');
   const chatContext = $document.flags.titan.chatContext;

   export let icon = void 0;
   export let label = void 0;
</script>

<div class="header">
   <!--Img-->
   <img src={chatContext.img} alt="img" />

   <!--Header-->
   <div class="label">
      <!--Sub Header-->
      <div class="name">
         {chatContext.name}
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
         }
      }
   }
</style>
