import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '@renderer/components/shared/EmptyState';

describe('EmptyState Component', () => {
  it('should render no-report variant', () => {
    render(
      <EmptyState
        variant="no-report"
        icon="📊"
        title="No Reports"
        message="You haven't generated any reports yet."
      />
    );

    expect(screen.getByText('No Reports')).toBeInTheDocument();
    expect(screen.getByText('You haven\'t generated any reports yet.')).toBeInTheDocument();
    expect(screen.getByText('📊')).toBeInTheDocument();
  });

  it('should render celebratory variant', () => {
    render(
      <EmptyState
        variant="celebratory"
        icon="🎉"
        title="All Caught Up!"
        message="You've processed all your emails."
      />
    );

    expect(screen.getByText('All Caught Up!')).toBeInTheDocument();
    expect(screen.getByText('You\'ve processed all your emails.')).toBeInTheDocument();
    expect(screen.getByText('🎉')).toBeInTheDocument();
  });

  it('should render no-results variant', () => {
    render(
      <EmptyState
        variant="no-results"
        icon="🔍"
        title="No Results Found"
        message="Try adjusting your search criteria."
      />
    );

    expect(screen.getByText('No Results Found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search criteria.')).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('should call onAction when button clicked', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <EmptyState
        variant="no-report"
        icon="📊"
        title="No Reports"
        message="You haven't generated any reports yet."
        actionLabel="Create Report"
        onAction={onAction}
      />
    );

    const button = screen.getByRole('button', { name: 'Create Report' });
    await user.click(button);

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('should not render button when onAction not provided', () => {
    render(
      <EmptyState
        variant="no-report"
        icon="📊"
        title="No Reports"
        message="You haven't generated any reports yet."
        actionLabel="Create Report"
      />
    );

    const button = screen.queryByRole('button', { name: 'Create Report' });
    expect(button).not.toBeInTheDocument();
  });

  it('should render submessage when provided', () => {
    render(
      <EmptyState
        variant="no-report"
        icon="📊"
        title="No Reports"
        message="You haven't generated any reports yet."
        submessage="Generate your first report to get started."
      />
    );

    expect(screen.getByText('Generate your first report to get started.')).toBeInTheDocument();
  });
});
