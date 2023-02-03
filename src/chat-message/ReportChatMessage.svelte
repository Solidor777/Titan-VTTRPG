<script>
   import { getContext } from "svelte";

   // Document reference
   const document = getContext("DocumentStore");
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="report">
   <!--Img-->
   {#if chatContext.img}
      <img src={chatContext.img} alt="img" />
   {/if}

   <!--Header-->
   <div class="header">
      <!--Main Header-->
      <div class="main">
         <!--Icon-->
         {#if chatContext.icon}
            <i class={chatContext.icon} />
         {/if}
         {chatContext.header}
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
      <div class="messages">
         {#each chatContext.line as line}
            <div class="line">{line}</div>
         {/each}
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../styles/Mixins.scss";

   .report {
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

      .header {
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
            flex-wrap: wrap;

            i {
               margin-right: 0.25rem;
            }

            .label {
               @include flex-row;
               @include flex-group-center;
               flex-wrap: wrap;
            }
         }

         .sub {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            margin-top: 0.25rem;
            flex-wrap: wrap;
         }
      }

      .messages {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         margin-top: 0.25rem;

         .line {
            @include flex-row;
            @include flex-group-center;
            margin-top: 0.25rem;
            flex-wrap: wrap;

            &:not(:last-child) {
               @include border-bottom;
               padding-bottom: 0.25rem;
            }
         }
      }
   }
</style>
