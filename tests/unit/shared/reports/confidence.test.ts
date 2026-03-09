/**
 * Unit tests for confidence level classification
 *
 * Tests T033: getConfidenceLevel and getConfidenceDisplay functions
 * Per task specification:
 * - ≥0.8: "high" level with "✓准确" badge
 * - 0.6-0.79: "medium" level with "!需复核" badge
 * - <0.6: "low" level with "!!需复核" badge
 *
 * @module tests/unit/shared/reports/confidence.test
 */

import { describe, it, expect } from 'vitest';
import { ConfidenceThresholds } from '@shared/utils/ConfidenceThresholds';

describe('ConfidenceThresholds.getConfidenceLevel', () => {
  describe('Happy path - high confidence (≥0.8)', () => {
    it('should return "high" for score 0.8', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(0.8);
      expect(result).toBe('high');
    });

    it('should return "high" for score 0.9', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(0.9);
      expect(result).toBe('high');
    });

    it('should return "high" for score 1.0', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(1.0);
      expect(result).toBe('high');
    });
  });

  describe('Happy path - medium confidence (0.6-0.79)', () => {
    it('should return "medium" for score 0.6', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(0.6);
      expect(result).toBe('medium');
    });

    it('should return "medium" for score 0.7', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(0.7);
      expect(result).toBe('medium');
    });

    it('should return "medium" for score 0.79', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(0.79);
      expect(result).toBe('medium');
    });
  });

  describe('Happy path - low confidence (<0.6)', () => {
    it('should return "low" for score 0.5', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(0.5);
      expect(result).toBe('low');
    });

    it('should return "low" for score 0.0', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(0.0);
      expect(result).toBe('low');
    });

    it('should return "low" for score 0.59', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(0.59);
      expect(result).toBe('low');
    });
  });

  describe('Edge cases - invalid scores', () => {
    it('should return "low" for NaN', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(NaN);
      expect(result).toBe('low');
    });

    it('should return "low" for negative score', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(-1);
      expect(result).toBe('low');
    });

    it('should return "low" for score > 1', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(2);
      expect(result).toBe('low');
    });

    it('should return "low" for Infinity', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(Infinity);
      expect(result).toBe('low');
    });

    it('should return "low" for null', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(null as any);
      expect(result).toBe('low');
    });

    it('should return "low" for undefined', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(undefined as any);
      expect(result).toBe('low');
    });
  });

  describe('Boundary conditions', () => {
    it('should return "medium" at exact 0.6 boundary', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(0.6);
      expect(result).toBe('medium');
    });

    it('should return "high" at exact 0.8 boundary', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(0.8);
      expect(result).toBe('high');
    });

    it('should return "low" just below 0.6', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(0.5999);
      expect(result).toBe('low');
    });

    it('should return "medium" just below 0.8', () => {
      const result = ConfidenceThresholds.getConfidenceLevel(0.7999);
      expect(result).toBe('medium');
    });
  });
});

describe('ConfidenceThresholds.getConfidenceDisplay', () => {
  describe('Happy path - Chinese labels', () => {
    it('should return correct display for high confidence', () => {
      const result = ConfidenceThresholds.getConfidenceDisplay(0.8);
      expect(result).toEqual({
        label: '✓准确',
        level: 'high'
      });
    });

    it('should return correct display for medium confidence', () => {
      const result = ConfidenceThresholds.getConfidenceDisplay(0.7);
      expect(result).toEqual({
        label: '!需复核',
        level: 'medium'
      });
    });

    it('should return correct display for low confidence', () => {
      const result = ConfidenceThresholds.getConfidenceDisplay(0.5);
      expect(result).toEqual({
        label: '!!需复核',
        level: 'low'
      });
    });
  });

  describe('Edge cases - invalid scores', () => {
    it('should return low display for NaN', () => {
      const result = ConfidenceThresholds.getConfidenceDisplay(NaN);
      expect(result).toEqual({
        label: '!!需复核',
        level: 'low'
      });
    });

    it('should return low display for negative score', () => {
      const result = ConfidenceThresholds.getConfidenceDisplay(-1);
      expect(result).toEqual({
        label: '!!需复核',
        level: 'low'
      });
    });

    it('should return low display for score > 1', () => {
      const result = ConfidenceThresholds.getConfidenceDisplay(2);
      expect(result).toEqual({
        label: '!!需复核',
        level: 'low'
      });
    });
  });
});
