import { describe, it, expect, vi } from 'vitest';
import { resolveMigrationAction } from '~/helpers/migration/MigrateWorld.js';

describe('resolveMigrationAction', () => {
   it.each([
      [
         'automatic',
         true,
         'migrate',
      ],
      [
         'automatic',
         false,
         'none',
      ],
      [
         'prompt',
         true,
         'prompt',
      ],
      [
         'prompt',
         false,
         'none',
      ],
   ])('mode %s with pending migration %s resolves to %s', (mode, needsMigration, action) => {
      expect(resolveMigrationAction(mode, () => needsMigration)).toBe(action);
   });

   it('Disabled resolves to none without scanning the world', () => {
      /** @type {Function} The world scan, which Disabled must not run. */
      const needsMigration = vi.fn(() => true);
      expect(resolveMigrationAction('disabled', needsMigration)).toBe('none');
      expect(needsMigration).not.toHaveBeenCalled();
   });
});
