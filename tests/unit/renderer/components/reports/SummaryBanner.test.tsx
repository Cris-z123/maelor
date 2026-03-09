/**
 * Component tests for SummaryBanner
 *
 * Tests T038: SummaryBanner component
 * Per task specification:
 * - Display daily email processing summary
 * - Template: 今天共处理 X 封邮件，其中 Y 件需要你重点关注
 * - Celebratory variant when reviewCount = 0
 * - Appropriate color coding (blue for normal, green for celebratory)
 *
 * @module tests/unit/renderer/components/reports/SummaryBanner.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryBanner } from '@renderer/components/reports/SummaryBanner';

describe('SummaryBanner', () => {
  it('should render summary with counts', () => {
    render(<SummaryBanner totalEmails={100} reviewCount={5} />);

    expect(screen.getByText(/今天共处理 100 封邮件/)).toBeInTheDocument();
    expect(screen.getByText(/其中 5 件需要你重点关注/)).toBeInTheDocument();
  });

  it('should render celebratory message when reviewCount is 0', () => {
    render(<SummaryBanner totalEmails={50} reviewCount={0} />);

    expect(screen.getByText('太棒了！所有项目都准确')).toBeInTheDocument();
  });

  it('should apply correct styling classes', () => {
    const { container } = render(<SummaryBanner totalEmails={100} reviewCount={5} />);

    const banner = container.firstChild as HTMLElement;
    expect(banner).toHaveClass('bg-blue-50');
    expect(banner).not.toHaveClass('bg-green-50');
  });

  it('should apply green styling when reviewCount is 0', () => {
    const { container } = render(<SummaryBanner totalEmails={50} reviewCount={0} />);

    const banner = container.firstChild as HTMLElement;
    expect(banner).toHaveClass('bg-green-50');
    expect(banner).not.toHaveClass('bg-blue-50');
  });
});
