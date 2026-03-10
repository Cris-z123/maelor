/**
 * Component tests for ConfidenceBadge
 *
 * Tests T044: Confidence Display Mode Switching
 * Per task specification:
 * - Add mode?: 'default' | 'ai-explanation' prop
 * - Default mode: "✓准确" for high, badges for medium/low
 * - AI mode: "置信度 0.85 (高/中/低)" format
 *
 * @module tests/unit/renderer/components/reports/ConfidenceBadge.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfidenceBadge } from '@renderer/components/reports/ConfidenceBadge';

describe('ConfidenceBadge - Default Mode', () => {
  it('should display "✓准确" for high confidence (≥0.8)', () => {
    render(<ConfidenceBadge confidence={0.85} mode="default" />);
    expect(screen.getByText('✓准确')).toBeInTheDocument();
  });

  it('should display gray badge for medium confidence (0.6-0.79)', () => {
    const { container } = render(<ConfidenceBadge confidence={0.7} mode="default" />);
    const badge = screen.getByTestId('confidence-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('[建议复核]');
  });

  it('should display red badge for low confidence (<0.6)', () => {
    const { container } = render(<ConfidenceBadge confidence={0.5} mode="default" />);
    const badge = screen.getByTestId('confidence-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('[来源待确认]');
  });

  it('should use default mode when mode prop is not provided', () => {
    render(<ConfidenceBadge confidence={0.85} />);
    expect(screen.getByText('✓准确')).toBeInTheDocument();
  });
});

describe('ConfidenceBadge - AI Explanation Mode', () => {
  it('should display numeric score with "高" for high confidence', () => {
    render(<ConfidenceBadge confidence={0.85} mode="ai-explanation" />);
    expect(screen.getByText('置信度 0.85 (高)')).toBeInTheDocument();
  });

  it('should display numeric score with "中" for medium confidence', () => {
    render(<ConfidenceBadge confidence={0.7} mode="ai-explanation" />);
    expect(screen.getByText('置信度 0.70 (中)')).toBeInTheDocument();
  });

  it('should display numeric score with "低" for low confidence', () => {
    render(<ConfidenceBadge confidence={0.5} mode="ai-explanation" />);
    expect(screen.getByText('置信度 0.50 (低)')).toBeInTheDocument();
  });

  it('should format confidence score to 2 decimal places', () => {
    render(<ConfidenceBadge confidence={0.8333} mode="ai-explanation" />);
    expect(screen.getByText('置信度 0.83 (高)')).toBeInTheDocument();
  });

  it('should handle edge case confidence of 1.0', () => {
    render(<ConfidenceBadge confidence={1.0} mode="ai-explanation" />);
    expect(screen.getByText('置信度 1.00 (高)')).toBeInTheDocument();
  });

  it('should handle edge case confidence of 0.0', () => {
    render(<ConfidenceBadge confidence={0.0} mode="ai-explanation" />);
    expect(screen.getByText('置信度 0.00 (低)')).toBeInTheDocument();
  });
});

describe('ConfidenceBadge - Mode Switching', () => {
  it('should render differently for same confidence in different modes', () => {
    const { rerender } = render(<ConfidenceBadge confidence={0.85} mode="default" />);
    expect(screen.getByText('✓准确')).toBeInTheDocument();

    rerender(<ConfidenceBadge confidence={0.85} mode="ai-explanation" />);
    expect(screen.getByText('置信度 0.85 (高)')).toBeInTheDocument();
    expect(screen.queryByText('✓准确')).not.toBeInTheDocument();
  });
});

describe('ConfidenceBadge - Custom Styling', () => {
  it('should apply custom className', () => {
    const { container } = render(
      <ConfidenceBadge confidence={0.85} mode="default" className="custom-class" />
    );
    const badge = screen.getByTestId('confidence-badge');
    expect(badge).toHaveClass('custom-class');
  });

  it('should maintain default styling with custom className', () => {
    const { container } = render(
      <ConfidenceBadge confidence={0.85} mode="default" className="custom-class" />
    );
    const badge = screen.getByTestId('confidence-badge');
    expect(badge).toHaveClass('text-green-600');
    expect(badge).toHaveClass('text-sm');
    expect(badge).toHaveClass('font-medium');
  });
});
