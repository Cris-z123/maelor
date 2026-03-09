import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CelebratoryEmptyState } from '@renderer/components/reports/CelebratoryEmptyState';

describe('CelebratoryEmptyState Component', () => {
  it('should render celebratory message', () => {
    render(<CelebratoryEmptyState scheduledTime="09:00" />);

    expect(screen.getByText('太棒了！')).toBeInTheDocument();
    expect(screen.getByText('AI 未发现任何急需处理的杂事')).toBeInTheDocument();
  });

  it('should render submessage', () => {
    render(<CelebratoryEmptyState scheduledTime="09:00" />);

    expect(screen.getByText('今日份的邮件已全部化解。享受你的专注时光吧！')).toBeInTheDocument();
  });
});
