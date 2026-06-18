<script>
   /**
    * @typedef {object} HudButtonProps
    * @property {'category' | 'sub-option' | 'sub-button' | 'chip' | 'restore' | 'ghost'} [variant] - Visual variant selecting the panel surface, padding, and alignment.
    * @property {boolean} [active] - Whether the button is in its open/revealed state (panel-3 surface plus the `active` class).
    * @property {'top' | 'right' | 'bottom' | 'left' | undefined} [accentEdge] - The edge to draw the accent bar on when active; omitted for no accent.
    * @property {'start' | 'end'} [align] - Horizontal content alignment for the text/icon variants; 'end' right-aligns.
    * @property {boolean} [disabled] - Whether the button is disabled.
    * @property {string} [type] - The native button type.
    * @property {string | undefined} [ariaLabel] - The accessible label.
    * @property {string | undefined} [testId] - Stable selector applied as `data-testid`.
    * @property {HTMLElement | undefined} [element] - Bindable reference to the underlying button element.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - The click handler.
    * @property {((event: PointerEvent) => void) | undefined} [onpointerenter] - The pointer-enter handler (sub-option reveal).
    * @property {((event: FocusEvent) => void) | undefined} [onfocus] - The focus handler (sub-option reveal).
    * @property {import('svelte').Snippet} children - The button content.
    */

   /** @type {HudButtonProps} */
   let {
      variant = 'category',
      active = false,
      accentEdge = undefined,
      align = 'start',
      disabled = false,
      type = 'button',
      ariaLabel = undefined,
      testId = undefined,
      element = $bindable(undefined),
      onclick = undefined,
      onpointerenter = undefined,
      onfocus = undefined,
      children,
   } = $props();
</script>

<button
   bind:this={element}
   class={`hud-button ${variant}`}
   class:active
   class:align-end={align === 'end'}
   class:accent-top={accentEdge === 'top'}
   class:accent-right={accentEdge === 'right'}
   class:accent-bottom={accentEdge === 'bottom'}
   class:accent-left={accentEdge === 'left'}
   {type}
   {disabled}
   aria-label={ariaLabel}
   data-testid={testId}
   {onclick}
   {onpointerenter}
   {onfocus}
>
   {@render children()}
</button>

<style lang="scss">
   // Every box/text property is defined from --titan-button-* tokens via @include button, so Foundry
   // core button styling cannot leak in. Variants override the tokens for each HUD surface; content
   // sizes the box (no forced min-height/line-height), which keeps tall content from clipping.
   .hud-button {
      @include button;

      // Release the mixin's fixed box so content drives height; the mixin derives min-height from
      // --titan-button-height, so a single override frees both.
      --titan-button-height: auto;
      --titan-button-line-height: normal;
      --titan-button-border-width: 0;
      --titan-button-font-size: var(--titan-font-size-small);
      --titan-button-font-weight: normal;

      // Standard panel radius. A literal is required: @include button remaps --titan-border-radius onto
      // --titan-button-border-radius, so referencing --titan-border-radius here would close a var()
      // cycle and zero the radius.
      --titan-button-border-radius: 8px;

      position: relative;
      gap: var(--titan-spacing-standard);
      cursor: pointer;
      white-space: nowrap;

      // Left-align content for the text/icon variants; the mixin centres by default.
      &.category,
      &.sub-option,
      &.sub-button,
      &.ghost {
         justify-content: flex-start;
         text-align: left;
      }

      // Right-align content (the vertical-dock rule: categories toward the flyout, sub-options away).
      &.align-end {
         justify-content: flex-end;
         text-align: right;
      }

      &.category {
         --titan-button-background: var(--titan-panel-2-background);
         --titan-button-font-color: var(--titan-panel-2-color);
         --titan-button-hover-background: var(--titan-panel-2-background);
         --titan-button-hover-font-color: var(--titan-panel-2-color);

         // Content-width in a horizontal bar; a vertical column stretches it via align-items: stretch.
         width: auto;
         padding: 3px var(--titan-spacing-standard);

         &.active {
            --titan-button-background: var(--titan-panel-3-background);
            --titan-button-font-color: var(--titan-panel-3-color);
         }
      }

      &.sub-option {
         --titan-button-background: var(--titan-panel-2-background);
         --titan-button-font-color: var(--titan-panel-2-color);
         --titan-button-hover-background: var(--titan-panel-2-background);
         --titan-button-hover-font-color: var(--titan-panel-2-color);

         padding: 6px var(--titan-spacing-standard);

         // The revealed row carries the panel-3 fill plus an accent edge-bar matching the open category.
         &.active {
            --titan-button-background: var(--titan-panel-3-background);
            --titan-button-font-color: var(--titan-panel-3-color);

            box-shadow: inset 2px 0 0 0 var(--titan-accent-color);
         }
      }

      &.sub-button {
         --titan-button-background: var(--titan-panel-3-background);
         --titan-button-font-color: var(--titan-panel-3-color);
         --titan-button-hover-background: var(--titan-panel-3-background);
         --titan-button-hover-font-color: var(--titan-panel-3-color);

         padding: 2px var(--titan-spacing-standard);
      }

      &.chip {
         --titan-button-background: var(--titan-panel-2-background);
         --titan-button-font-color: var(--titan-panel-2-color);
         --titan-button-hover-background: var(--titan-panel-2-background);
         --titan-button-hover-font-color: var(--titan-panel-2-color);

         width: auto;
         padding: 1px 5px;
      }

      &.restore {
         --titan-button-background: var(--titan-panel-2-background);
         --titan-button-font-color: var(--titan-panel-2-color);
         --titan-button-hover-background: var(--titan-panel-2-background);
         --titan-button-hover-font-color: var(--titan-panel-2-color);

         width: auto;
         padding: var(--titan-spacing-standard);
      }

      // The ghost variant is transparent (it sits on a panel-2 row), so its text uses the panel-2 pair.
      &.ghost {
         --titan-button-background: transparent;
         --titan-button-font-color: var(--titan-panel-2-color);
         --titan-button-hover-background: transparent;
         --titan-button-hover-font-color: var(--titan-panel-2-color);

         padding: 0;
      }

      // The accent edge-bar marks an open/active button on the edge facing its flyout.
      &.active.accent-top::after,
      &.active.accent-right::after,
      &.active.accent-bottom::after,
      &.active.accent-left::after {
         content: '';
         position: absolute;
         background: var(--titan-accent-color);
      }

      &.active.accent-top::after {
         left: 0;
         right: 0;
         top: 0;
         height: 2px;
      }

      &.active.accent-bottom::after {
         left: 0;
         right: 0;
         bottom: 0;
         height: 2px;
      }

      &.active.accent-left::after {
         top: 0;
         bottom: 0;
         left: 0;
         width: 2px;
      }

      &.active.accent-right::after {
         top: 0;
         bottom: 0;
         right: 0;
         width: 2px;
      }
   }
</style>
