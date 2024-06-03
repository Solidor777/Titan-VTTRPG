<script>
   import {getContext} from 'svelte';

   // Document reference
   const document = getContext('document');
   const titanFlags = $document.flags.titan;

   export let icon = void 0;
   export let label = void 0;
</script>

<div class="header">
   <!--Img-->
   <img alt="img" src={titanFlags.img}/>

   <!--Header-->
   <div class="label">
      <!--Sub Header-->
      <div class="name">
         {titanFlags.name}
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
         margin-bottom: var(--titan-padding-large);
      }

      .label {
         @include flex-column;
         @include flex-group-top;
         @include panel-1;
         @include border;

         width: 100%;
         padding: var(--titan-padding-standard);

         .main {
            @include flex-row;
            @include flex-group-center;
            @include font-size-large;

            width: 100%;
            margin: var(--titan-padding-standard) 0 var(--titan-padding-standard);
            flex-wrap: wrap;

            i {
               margin-right: var(--titan-padding-standard);
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
