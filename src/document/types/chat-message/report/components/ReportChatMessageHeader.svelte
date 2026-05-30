<script>
   /**
    * @typedef {object} ReportChatMessageHeaderProps
    * @property {string} [headerLabel] Main label for the header.
    * @property {string} [headerIcon] The icon class for the header.
    * @property {string[]} [subHeaderLabels] Labels for the sub-headers.
    * @property {string[]} [images] Images to display.
    */

   /** @type {ReportChatMessageHeaderProps} */
   const {
      headerLabel = void 0,
      headerIcon = void 0,
      subHeaderLabels = void 0,
      images = void 0,
   } = $props();
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
         <i class={headerIcon}></i>
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

         @include margin-bottom-standard;

         &:not(:first-child) {
            @include margin-left-large;
         }
      }

      .header {
         @include flex-column;
         @include flex-group-top;
         @include border;
         @include panel-1;
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

         .sub {
            @include flex-row;
            @include flex-group-center;

            width: 100%;
            flex-wrap: wrap;

            &:not(:first-child) {
               @include margin-top-standard;
            }
         }
      }
   }
</style>
