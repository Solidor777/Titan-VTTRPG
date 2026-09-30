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
   ])('mode %s with pending migration %s resolves to %s', async (mode, needsMigration, action) => {
      expect(await resolveMigrationAction(mode, async () => needsMigration)).toBe(action);
   });

   it('Disabled resolves to none without scanning the world', async () => {
      /** @type {Function} The world scan, which Disabled must not run. */
      const needsMigration = vi.fn(async () => true);
      expect(await resolveMigrationAction('disabled', needsMigration)).toBe('none');
      expect(needsMigration).not.toHaveBeenCalled();
   });
});
