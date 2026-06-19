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
      <div class="headers">
         <h1>{localize('themePreviewHeader')} 1</h1>
         <h2>{localize('themePreviewHeader')} 2</h2>
         <h3>{localize('themePreviewHeader')} 3</h3>
         <h4>{localize('themePreviewHeader')} 4</h4>
         <h5>{localize('themePreviewHeader')} 5</h5>
         <h6>{localize('themePreviewHeader')} 6</h6>
      </div>
      <div class="chips">
         <span class="chip body">{localize('body')} 4</span>
         <span class="chip mind">{localize('mind')} 3</span>
         <span class="chip soul">{localize('soul')} 2</span>
      </div>
      <div class="panel panel-1">
         <span class="panel-label">{localize('themePreviewPanel')} 1</span>
         <button class="sample-button">⚅ 6d6</button>
         <span class="sample-tag">{localize('rare')}</span>
         <input
            class="sample-input"
            type="text"
            value="Sample"
         />
      </div>
      <div class="panel panel-2">
         <span class="panel-label">{localize('themePreviewPanel')} 2</span>
      </div>
      <div class="panel panel-3">
         <span class="panel-label">{localize('themePreviewPanel')} 3</span>
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

         // Sample headings; their color comes from the per-level header tokens (Global.scss). Only the
         // compact sizing is set here so all six levels fit the narrow pane.
         .headers {
            @include flex-column;
            @include flex-group-top-left;

            gap: 2px;
            margin-bottom: var(--titan-spacing-large);

            :is(h1, h2, h3, h4, h5, h6) {
               border: none;
               font-size: var(--titan-font-size-small);
               margin: 0;
            }
         }

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

         // Each panel surface (panel-1/2/3) is shown so the ramp's separation is visible at a glance.
         .panel {
            @include flex-row;

            align-items: center;
            border-radius: var(--titan-border-radius);
            gap: var(--titan-spacing-standard);
            margin: var(--titan-spacing-standard) 0;
            padding: var(--titan-spacing-large);

            .panel-label {
               font-weight: bold;
               white-space: nowrap;
            }

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

         .panel-1 {
            @include panel-1;
         }

         .panel-2 {
            @include panel-2;
         }

         .panel-3 {
            @include panel-3;
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
