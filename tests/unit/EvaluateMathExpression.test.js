import { describe, it, expect } from 'vitest';
import evaluateMathExpression from '~/helpers/utility-functions/EvaluateMathExpression.js';

describe('evaluateMathExpression', () => {
   it('evaluates a plain number', () => {
      expect(evaluateMathExpression('15')).toBe(15);
      expect(evaluateMathExpression('  42  ')).toBe(42);
   });

   it('evaluates addition and subtraction', () => {
      expect(evaluateMathExpression('10+5')).toBe(15);
      expect(evaluateMathExpression('10 - 3')).toBe(7);
      expect(evaluateMathExpression('1+2+3-4')).toBe(2);
   });

   it('respects multiplication and division precedence over addition', () => {
      expect(evaluateMathExpression('2+3*4')).toBe(14);
      expect(evaluateMathExpression('20/4-1')).toBe(4);
      expect(evaluateMathExpression('1+8/2')).toBe(5);
   });

   it('evaluates parentheses and grouping', () => {
      expect(evaluateMathExpression('(10+5)')).toBe(15);
      expect(evaluateMathExpression('(4+2)*5')).toBe(30);
      expect(evaluateMathExpression('2*(3+(4-1))')).toBe(12);
   });

   it('evaluates decimals', () => {
      expect(evaluateMathExpression('1.5+2.5')).toBe(4);
      expect(evaluateMathExpression('7/2')).toBe(3.5);
   });

   it('evaluates unary minus and plus', () => {
      expect(evaluateMathExpression('-5')).toBe(-5);
      expect(evaluateMathExpression('3*-2')).toBe(-6);
      expect(evaluateMathExpression('-(2+3)')).toBe(-5);
      expect(evaluateMathExpression('+7')).toBe(7);
   });

   it('treats a redundant sign after an operator as a unary sign on the operand', () => {
      expect(evaluateMathExpression('10++5')).toBe(15);
      expect(evaluateMathExpression('10+-5')).toBe(5);
   });

   it('applies a leading operator relative to the current value', () => {
      expect(evaluateMathExpression('+5', { currentValue: 12 })).toBe(17);
      expect(evaluateMathExpression('-3', { currentValue: 12 })).toBe(9);
      expect(evaluateMathExpression('*2', { currentValue: 12 })).toBe(24);
      expect(evaluateMathExpression('/2', { currentValue: 12 })).toBe(6);
   });

   it('treats a leading number or parenthesis as a literal expression, not relative', () => {
      expect(evaluateMathExpression('10+5', { currentValue: 12 })).toBe(15);
      expect(evaluateMathExpression('(4+2)*5', { currentValue: 12 })).toBe(30);
   });

   it('defaults the relative base to zero when no current value is supplied', () => {
      expect(evaluateMathExpression('+5')).toBe(5);
      expect(evaluateMathExpression('-3')).toBe(-3);
   });

   it('returns null for malformed input', () => {
      expect(evaluateMathExpression('')).toBeNull();
      expect(evaluateMathExpression('   ')).toBeNull();
      expect(evaluateMathExpression('10+')).toBeNull();
      expect(evaluateMathExpression('10**5')).toBeNull();
      expect(evaluateMathExpression('(10+5')).toBeNull();
      expect(evaluateMathExpression('10+5)')).toBeNull();
      expect(evaluateMathExpression('10abc')).toBeNull();
      expect(evaluateMathExpression('abc')).toBeNull();
      expect(evaluateMathExpression('1.2.3')).toBeNull();
      expect(evaluateMathExpression('.')).toBeNull();
   });

   it('returns null for division by zero', () => {
      expect(evaluateMathExpression('5/0')).toBeNull();
      expect(evaluateMathExpression('5/(2-2)')).toBeNull();
   });

   it('returns null for non-string input', () => {
      expect(evaluateMathExpression(undefined)).toBeNull();
      expect(evaluateMathExpression(null)).toBeNull();
      expect(evaluateMathExpression(15)).toBeNull();
   });
});
