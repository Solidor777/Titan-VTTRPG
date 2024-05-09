<script>
   import { getContext } from 'svelte';

   // Document reference
   const document = getContext('document');
   const chatContext = $document.flags.titan;

   export let icon = void 0;
   export let label = void 0;
</script>

<div class="header">
   <!--Img-->
   <img src={chatContext.img} alt="img"/>

   <!--Header-->
   <div class="label">
      <!--Sub Header-->
      <div class="name">
         {chatContext.name}
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
         margin-bottom: var(--padding-large);
      }

      .label {
         @include flex-column;
         @include flex-group-top;
         @include panel-1;
         @include border;
         width: 100%;
         padding: var(--padding-standard);

         .main {
            @include flex-row;
            @include flex-group-center;
            @include font-size-large;
            width: 100%;
            margin: var(--padding-standard) 0 var(--padding-standard);
            flex-wrap: wrap;

            i {
               margin-right: var(--padding-standard);
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
