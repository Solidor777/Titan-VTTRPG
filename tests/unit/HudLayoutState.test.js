import { describe, it, expect, vi } from 'vitest';
import HudLayoutState from '~/ui/player-hud/HudLayoutState.svelte.js';
import { createDefaultHudLayout } from '~/ui/player-hud/PlayerHudDefaults.js';

/**
 * Builds a state instance over a default layout with a spy saver.
 * @returns {{state: HudLayoutState, onSave: Function}} The state and its save spy.
 */
function build() {
   const onSave = vi.fn();
   return { state: new HudLayoutState({ layout: createDefaultHudLayout(), onSave }), onSave };
}

describe('HudLayoutState', () => {
   it('loads positions, size, and minimized flags from the layout', () => {
      const { state } = build();
      expect(state.positions.portrait.anchorX).toBe('left');
      expect(state.effectsPanelSize.width).toBe(260);
      expect(state.minimized.actionMenu).toBe(false);
   });

   it('persists a snapshot on persist()', () => {
      const { state, onSave } = build();
      state.positions.portrait = { anchorX: 'right', anchorY: 'top', dx: 1, dy: 2 };
      state.persist();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
         positions: expect.objectContaining({
            portrait: { anchorX: 'right', anchorY: 'top', dx: 1, dy: 2 },
         }),
      }));
   });

   it('toggles and persists minimized state', () => {
      const { state, onSave } = build();
      state.toggleMinimized('portrait');
      expect(state.minimized.portrait).toBe(true);
      expect(onSave).toHaveBeenCalled();
   });

   it('resets to defaults and persists', () => {
      const { state, onSave } = build();
      state.positions.portrait.dx = 400;
      state.minimized.portrait = true;
      state.reset();
      expect(state.positions.portrait.dx).toBe(16);
      expect(state.minimized.portrait).toBe(false);
      expect(onSave).toHaveBeenCalled();
   });
});
