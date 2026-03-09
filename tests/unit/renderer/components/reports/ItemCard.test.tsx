/**
 * Component tests for ItemCard
 *
 * Tests T035: ItemCard expand/collapse functionality
 * Per task specification:
 * - CSS-based animation (300ms transition)
 * - Expand/collapse icon rotation
 * - Confidence badge display
 * - Feedback buttons when expanded
 * - Keyboard navigation (Enter, Space)
 *
 * @module tests/unit/renderer/components/reports/ItemCard.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemCard } from '@renderer/components/reports/ItemCard';

// Mock ReportDisplayItem type
const mockItem = {
  id: 1,
  title: 'Test Action Item',
  confidence: 0.8,
  priority: 'high',
  description: 'Test description',
  dueDate: '2025-03-10',
  sender: 'test@example.com',
  subject: 'Test Subject'
};

describe('ItemCard - Expand/Collapse Animation', () => {
  it('should render collapsed by default', () => {
    const { container } = render(
      <ItemCard
        item={mockItem}
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />
    );

    // Details section should be hidden
    const details = container.querySelector('[class*="max-h-0"]');
    expect(details).toBeInTheDocument();
  });

  it('should call onToggleExpand when clicked', () => {
    const onToggleExpand = vi.fn();
    const { container } = render(
      <ItemCard
        item={mockItem}
        isExpanded={false}
        onToggleExpand={onToggleExpand}
      />
    );

    const card = container.firstChild as HTMLElement;
    fireEvent.click(card);

    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('should apply CSS transition classes', () => {
    const { container } = render(
      <ItemCard
        item={mockItem}
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('transition-all');
    expect(card).toHaveClass('duration-300');
  });

  it('should show details when expanded', () => {
    const { container } = render(
      <ItemCard
        item={mockItem}
        isExpanded={true}
        onToggleExpand={vi.fn()}
      />
    );

    const details = container.querySelector('[class*="max-h-96"]');
    expect(details).toBeInTheDocument();
  });

  it('should rotate chevron icon when expanded', () => {
    const { container } = render(
      <ItemCard
        item={mockItem}
        isExpanded={true}
        onToggleExpand={vi.fn()}
      />
    );

    const chevron = container.querySelector('svg');
    expect(chevron).toHaveClass('rotate-180');
  });
});

describe('ItemCard - Visual Elements', () => {
  it('should display confidence badge with correct label', () => {
    render(
      <ItemCard
        item={mockItem}
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />
    );

    expect(screen.getByText('✓准确')).toBeInTheDocument();
  });

  it('should display item title', () => {
    render(
      <ItemCard
        item={mockItem}
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />
    );

    expect(screen.getByText('Test Action Item')).toBeInTheDocument();
  });

  it('should render feedback buttons when expanded', () => {
    render(
      <ItemCard
        item={mockItem}
        isExpanded={true}
        onToggleExpand={vi.fn()}
      />
    );

    // Check for feedback buttons (tooltip text from spec)
    const okButton = screen.queryByRole('button', { name: /标记准确/i });
    const errorButton = screen.queryByRole('button', { name: /标记错误/i });

    expect(okButton).toBeInTheDocument();
    expect(errorButton).toBeInTheDocument();
  });

  it('should display ConfidenceBadge for medium confidence', () => {
    const mediumConfidenceItem = {
      ...mockItem,
      confidence: 0.5
    };

    render(
      <ItemCard
        item={mediumConfidenceItem}
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />
    );

    // Should render ConfidenceBadge component instead of checkmark
    const checkmark = screen.queryByText('✓准确');
    expect(checkmark).not.toBeInTheDocument();

    // ConfidenceBadge should be present (it has data-testid attribute)
    const badge = screen.queryByTestId('confidence-badge');
    expect(badge).toBeInTheDocument();
  });
});

describe('ItemCard - Keyboard Navigation', () => {
  it('should toggle expansion on Enter key', () => {
    const onToggleExpand = vi.fn();
    const { container } = render(
      <ItemCard
        item={mockItem}
        isExpanded={false}
        onToggleExpand={onToggleExpand}
      />
    );

    const card = container.firstChild as HTMLElement;
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('should toggle expansion on Space key', () => {
    const onToggleExpand = vi.fn();
    const { container } = render(
      <ItemCard
        item={mockItem}
        isExpanded={false}
        onToggleExpand={onToggleExpand}
      />
    );

    const card = container.firstChild as HTMLElement;
    fireEvent.keyDown(card, { key: ' ' });

    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('should update aria-expanded attribute', () => {
    const { container, rerender } = render(
      <ItemCard
        item={mockItem}
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveAttribute('aria-expanded', 'false');

    rerender(
      <ItemCard
        item={mockItem}
        isExpanded={true}
        onToggleExpand={vi.fn()}
      />
    );

    expect(card).toHaveAttribute('aria-expanded', 'true');
  });
});
