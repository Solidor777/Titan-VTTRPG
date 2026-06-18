import { describe, it, expect } from 'vitest';
import portalToBody from '~/helpers/svelte-actions/PortalToBody.js';

describe('portalToBody action', () => {
   it('moves the node to document.body on mount and removes it on destroy', () => {
      // A node nested inside a detached parent, simulating a clipped ancestor.
      const parent = document.createElement('div');
      const node = document.createElement('div');
      parent.appendChild(node);
      document.body.appendChild(parent);

      const handle = portalToBody(node);
      expect(node.parentElement).toBe(document.body);

      handle.destroy();
      expect(node.parentElement).toBeNull();

      parent.remove();
   });
});
