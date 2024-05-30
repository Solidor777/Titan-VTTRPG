<script>
   /** @type string Main label for the header. */
   export let headerLabel = void 0;

   /** @type string Icon for the header. */
   export let headerIcon = void 0;

   /** @type string[] Labels for the sub-headers. */
   export let subHeaderLabels = void 0;

   /** @type string[] Images to display. */
   export let images = void 0;
</script>

<div class="header">
   <!--Images-->
   <div class="images">
      {#each images as image}
         <img src={image} alt="img"/>
      {/each}
   </div>

   <!--Header-->
   <div class="header">

      <!--Sub Headers-->
      {#each subHeaderLabels as label}
         <div class="sub">
            {label}
         </div>
      {/each}

      <!--Main Header-->
      <div class="main">
         <i class={headerIcon}/>
         {headerLabel}
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
         @include border;
         @include panel-1;

         width: 80px;
         margin-bottom: var(--titan-padding-standard);

         &:not(:first-child) {
            margin-left: var(--titan-padding-large);
         }
      }

      .header {
         @include flex-column;
         @include flex-group-top;
         @include border;
         @include panel-1;

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

         .sub {
            @include flex-row;
            @include flex-group-center;

            width: 100%;
            flex-wrap: wrap;

            &:not(:first-child) {
               margin-top: var(--titan-padding-standard);
            }
         }
      }
   }
</style>
