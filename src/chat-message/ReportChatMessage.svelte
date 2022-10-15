<script>
   import { getContext } from "svelte";

   // Document reference
   const document = getContext("DocumentStore");
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="report">
   <!--Img-->
   {#if chatContext.img}
      <img source={chatContext.img} alt="img" />
   {/if}

   <!--Header-->
   <div class="header">
      <!--Main Header-->
      <div class="main">
         <!--Icon-->
         {#if chatContext.icon}
            <i class={chatContext.icon} />
         {/if}

         <!--Label-->
         <div class="label">
            {chatContext.header}
         </div>
      </div>

      <!--Sub Header-->
      {#if chatContext.subHeader}
         <div class="sub">
            {chatContext.subHeader}
         </div>
      {/if}
   </div>

   <!--Lines-->
   {#if chatContext.line && chatContext.line.length > 0}
      {#each chatContext.line as line}
         <div class="line">{line}</div>
      {/each}
   {/if}
</div>

<style lang="scss">
   @import "../styles/Mixins.scss";

   .report {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      img {
         border: none;
         width: 5rem;
         margin-bottom: 0.5rem;
      }

      .header {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         font-weight: bold;

         .main {
            @include flex-row;
            @include flex-group-center;
            @include font-size-large;
            width: 100%;

            i {
               margin-right: 0.25rem;
            }

            .label {
               @include flex-row;
               @include flex-group-center;
               width: 100%;
            }
         }

         .sub {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            margin-top: 0.25rem;
         }
      }

      .line {
         @include flex-row;
         @include flex-group-center;
         margin-top: 0.25rem;

         :not(:first-child) {
            @include border-top;
            padding-top: 0.25rem;
         }
      }
   }
</style>
