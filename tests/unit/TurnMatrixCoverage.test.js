import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DURATION_TYPES } from '~/system/DurationTypes.js';
import { MODES, TURN_BOOLEAN_SETTINGS, TURN_MODE_SETTINGS, TURN_REPORT_TYPES } from '../e2e/turnMatrix.js';

/** @type {string} The text of the turn matrix spec. */
const spec = fs.readFileSync(path.resolve(__dirname, '../e2e/turn-matrix.spec.js'), 'utf8');
/** @type {string} The text of the system settings registration. */
const settings = fs.readFileSync(path.resolve(__dirname, '../../src/system/SystemSettings.js'), 'utf8');
/** @type {string} The report type directory. */
const reportDir = path.resolve(__dirname, '../../src/document/types/chat-message/report/types');
/** @type {string} The text of the turn code. */
const turnCode = fs.readFileSync(
   path.resolve(__dirname, '../../src/document/types/actor/types/character/CharacterDataModel.js'),
   'utf8',
);

describe('the turn matrix covers everything the source defines', () => {
   it('runs every duration type through the expiry matrix', () => {
      expect(spec).toContain('for (const type of DURATION_TYPES)');
      expect(DURATION_TYPES.length).toBeGreaterThan(0);
   });

   it('lists every three-valued turn setting of the source and every value of them', () => {
      /** @type {string[]} Settings registered with the enabled/showButton/disabled choices. */
      const found = [...settings.matchAll(/register\('titan', '(\w+)', \{\s*choices: \{\s*enabled:/g)]
         .map((match) => match[1]);
      expect(TURN_MODE_SETTINGS.toSorted()).toEqual(found.toSorted());
      expect(MODES).toEqual([
         'enabled',
         'showButton',
         'disabled',
      ]);
   });

   it('lists the boolean turn settings the turn code reads', () => {
      for (const key of TURN_BOOLEAN_SETTINGS) {
         expect(settings).toContain(`'${key}'`);
      }
   });

   it('lists every report type a turn posts', () => {
      /** @type {string[]} The report types the turn code creates. */
      const posted = [...turnCode.matchAll(/\.type = '(turn\w+Report|effectsExpiredReport)'/g)].map((m) => m[1]);
      expect(TURN_REPORT_TYPES.toSorted()).toEqual([...new Set(posted)].toSorted());
      for (const type of TURN_REPORT_TYPES) {
         expect(spec).toContain(`'${type}'`);
      }
      /** @type {string[]} The report type directories. */
      const dirs = fs.readdirSync(reportDir);
      expect(dirs.length).toBeGreaterThanOrEqual(TURN_REPORT_TYPES.length);
   });
});
