<script>
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} ThemePreviewPaneProps
    * @property {Object<string, string>} [tokens] - The draft theme tokens to preview.
    */

   /** @type {ThemePreviewPaneProps} */
   const { tokens = {} } = $props();

   /** @type {string} The inline style declaring every draft token as a scoped custom property. */
   const styleVars = $derived(
      Object.entries(tokens).map(([token, value]) => `--titan-${token}: ${value}`).join('; '),
   );
</script>

<div
   class="preview"
   style={styleVars}
>
   <div class="app-surface">
      <div class="chips">
         <span class="chip body">{localize('body')} 4</span>
         <span class="chip mind">{localize('mind')} 3</span>
         <span class="chip soul">{localize('soul')} 2</span>
      </div>
      <div class="panel">
         <button class="sample-button">⚅ 6d6</button>
         <span class="sample-tag">{localize('rare')}</span>
         <input
            class="sample-input"
            type="text"
            value="Sample"
         />
      </div>
      <div class="chat-card public">{localize('chatPreviewPublic')}</div>
      <div class="chat-card secret">{localize('chatPreviewSecret')}</div>
      <div class="chat-card gm">{localize('chatPreviewGmOnly')}</div>
   </div>
</div>

<style lang="scss">
   .preview {
      flex: 0 0 280px;
      overflow-y: auto;

      .app-surface {
         background: var(--titan-app-background);
         border-radius: var(--titan-border-radius);
         color: var(--titan-app-font-color);
         font-family: var(--titan-font-family-normal), sans-serif;
         padding: var(--titan-spacing-large);

         .chips {
            @include flex-row;

            gap: var(--titan-spacing-standard);

            .chip {
               @include label;
               @include attribute-colors;

               border-radius: var(--titan-label-border-radius);
               padding: var(--titan-label-padding);
               text-align: center;
               width: 100%;
            }
         }

         .panel {
            @include panel-1;
            @include flex-row;

            align-items: center;
            border-radius: var(--titan-border-radius);
            gap: var(--titan-spacing-standard);
            margin: var(--titan-spacing-large) 0;
            padding: var(--titan-spacing-large);

            .sample-button {
               @include button;

               width: auto;
            }

            .sample-tag {
               @include tag;
            }

            .sample-input {
               @include input;

               width: auto;
               min-width: 0;
               flex: 1;
            }
         }

         .chat-card {
            border-radius: var(--titan-border-radius);
            margin-top: var(--titan-spacing-standard);
            padding: var(--titan-spacing-standard);

            &.public {
               background: var(--titan-chat-public-background);
            }

            &.secret {
               background: var(--titan-chat-secret-background);
            }

            &.gm {
               background: var(--titan-chat-gm-background);
            }
         }
      }
   }
</style>
