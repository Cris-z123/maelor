/**
 * Component tests for ItemDetails
 *
 * Tests T040: ItemDetails component
 * Per task specification:
 * - Render extraction rationale
 * - Render email metadata
 * - Render copy search term button
 * - Call onCopy when button clicked
 * - Show copied confirmation
 * - Render confidence breakdown in AI mode
 * - Not render confidence breakdown in default mode
 *
 * @module tests/unit/renderer/components/reports/ItemDetails.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemDetails } from '@renderer/components/reports/ItemDetails';

// Mock DisplayItem type
const mockItem = {
  id: '1',
  content: {
    title: 'Complete project report',
    description: 'Finish the quarterly report by end of week',
    dueDate: '2025-03-15',
    priority: 'high' as const
  },
  confidence: {
    score: 0.85,
    level: 'high' as const
  },
  sourceEmails: [
    {
      sender: 'manager@company.com',
      subject: 'Project Update Required',
      date: '2025-03-10'
    }
  ]
};

describe('ItemDetails - Extraction Rationale', () => {
  it('should render extraction rationale', () => {
    render(
      <ItemDetails
        item={mockItem}
        aiExplanationMode={false}
        searchTerm="project report"
        onCopy={vi.fn()}
        copied={false}
      />
    );

    expect(screen.getByText('Extraction Rationale')).toBeInTheDocument();
  });
});

describe('ItemDetails - Email Metadata', () => {
  it('should render email metadata', () => {
    render(
      <ItemDetails
        item={mockItem}
        aiExplanationMode={false}
        searchTerm="project"
        onCopy={vi.fn()}
        copied={false}
      />
    );

    expect(screen.getByText('Source Emails')).toBeInTheDocument();
    // Use a function matcher for text broken up by multiple elements
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'From: manager@company.com';
    })).toBeInTheDocument();
    expect(screen.getByText('Project Update Required')).toBeInTheDocument();
  });

  it('should render multiple source emails', () => {
    const itemWithMultipleEmails = {
      ...mockItem,
      sourceEmails: [
        {
          sender: 'manager@company.com',
          subject: 'Project Update Required',
          date: '2025-03-10'
        },
        {
          sender: 'team@company.com',
          subject: 'Follow-up on Report',
          date: '2025-03-09'
        }
      ]
    };

    render(
      <ItemDetails
        item={itemWithMultipleEmails}
        aiExplanationMode={false}
        searchTerm="project"
        onCopy={vi.fn()}
        copied={false}
      />
    );

    expect(screen.getByText((content, element) => {
      return element?.textContent === 'From: manager@company.com';
    })).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'From: team@company.com';
    })).toBeInTheDocument();
    expect(screen.getByText('Project Update Required')).toBeInTheDocument();
    expect(screen.getByText('Follow-up on Report')).toBeInTheDocument();
  });
});

describe('ItemDetails - Copy Search Term Button', () => {
  it('should render copy search term button', () => {
    render(
      <ItemDetails
        item={mockItem}
        aiExplanationMode={false}
        searchTerm="project report"
        onCopy={vi.fn()}
        copied={false}
      />
    );

    const copyButton = screen.getByRole('button', { name: /copy search term/i });
    expect(copyButton).toBeInTheDocument();
  });

  it('should call onCopy when button clicked', () => {
    const onCopy = vi.fn().mockResolvedValue(true);

    render(
      <ItemDetails
        item={mockItem}
        aiExplanationMode={false}
        searchTerm="project report"
        onCopy={onCopy}
        copied={false}
      />
    );

    const copyButton = screen.getByRole('button', { name: /copy search term/i });
    fireEvent.click(copyButton);

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onCopy).toHaveBeenCalledWith('project report');
  });

  it('should show copied confirmation', () => {
    render(
      <ItemDetails
        item={mockItem}
        aiExplanationMode={false}
        searchTerm="project report"
        onCopy={vi.fn()}
        copied={true}
      />
    );

    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('should not show copied confirmation when not copied', () => {
    render(
      <ItemDetails
        item={mockItem}
        aiExplanationMode={false}
        searchTerm="project report"
        onCopy={vi.fn()}
        copied={false}
      />
    );

    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
  });
});

describe('ItemDetails - Confidence Breakdown', () => {
  it('should render confidence breakdown in AI mode', () => {
    render(
      <ItemDetails
        item={mockItem}
        aiExplanationMode={true}
        searchTerm="project"
        onCopy={vi.fn()}
        copied={false}
      />
    );

    expect(screen.getByText('Confidence Breakdown')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('should not render confidence breakdown in default mode', () => {
    render(
      <ItemDetails
        item={mockItem}
        aiExplanationMode={false}
        searchTerm="project"
        onCopy={vi.fn()}
        copied={false}
      />
    );

    expect(screen.queryByText('Confidence Breakdown')).not.toBeInTheDocument();
    expect(screen.queryByText('85%')).not.toBeInTheDocument();
  });

  it('should display confidence level in AI mode', () => {
    render(
      <ItemDetails
        item={mockItem}
        aiExplanationMode={true}
        searchTerm="project"
        onCopy={vi.fn()}
        copied={false}
      />
    );

    expect(screen.getByText('High Confidence')).toBeInTheDocument();
  });

  it('should display medium confidence correctly', () => {
    const mediumConfidenceItem = {
      ...mockItem,
      confidence: {
        score: 0.65,
        level: 'medium' as const
      }
    };

    render(
      <ItemDetails
        item={mediumConfidenceItem}
        aiExplanationMode={true}
        searchTerm="project"
        onCopy={vi.fn()}
        copied={false}
      />
    );

    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('Medium Confidence')).toBeInTheDocument();
  });

  it('should display low confidence correctly', () => {
    const lowConfidenceItem = {
      ...mockItem,
      confidence: {
        score: 0.45,
        level: 'low' as const
      }
    };

    render(
      <ItemDetails
        item={lowConfidenceItem}
        aiExplanationMode={true}
        searchTerm="project"
        onCopy={vi.fn()}
        copied={false}
      />
    );

    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('Low Confidence')).toBeInTheDocument();
  });
});

describe('ItemDetails - Content Display', () => {
  it('should render item title', () => {
    render(
      <ItemDetails
        item={mockItem}
        aiExplanationMode={false}
        searchTerm="project"
        onCopy={vi.fn()}
        copied={false}
      />
    );

    expect(screen.getByText('Complete project report')).toBeInTheDocument();
  });

  it('should render item description', () => {
    render(
      <ItemDetails
        item={mockItem}
        aiExplanationMode={false}
        searchTerm="project"
        onCopy={vi.fn()}
        copied={false}
      />
    );

    expect(screen.getByText('Finish the quarterly report by end of week')).toBeInTheDocument();
  });

  it('should render due date', () => {
    render(
      <ItemDetails
        item={mockItem}
        aiExplanationMode={false}
        searchTerm="project"
        onCopy={vi.fn()}
        copied={false}
      />
    );

    expect(screen.getByText('2025-03-15')).toBeInTheDocument();
  });

  it('should render priority', () => {
    render(
      <ItemDetails
        item={mockItem}
        aiExplanationMode={false}
        searchTerm="project"
        onCopy={vi.fn()}
        copied={false}
      />
    );

    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('should handle missing description', () => {
    const itemWithoutDescription = {
      ...mockItem,
      content: {
        ...mockItem.content,
        description: undefined
      }
    };

    render(
      <ItemDetails
        item={itemWithoutDescription}
        aiExplanationMode={false}
        searchTerm="project"
        onCopy={vi.fn()}
        copied={false}
      />
    );

    // Should not throw error and should still render title
    expect(screen.getByText('Complete project report')).toBeInTheDocument();
  });

  it('should handle missing due date', () => {
    const itemWithoutDueDate = {
      ...mockItem,
      content: {
        ...mockItem.content,
        dueDate: undefined
      }
    };

    render(
      <ItemDetails
        item={itemWithoutDueDate}
        aiExplanationMode={false}
        searchTerm="project"
        onCopy={vi.fn()}
        copied={false}
      />
    );

    // Should not throw error and should still render title
    expect(screen.getByText('Complete project report')).toBeInTheDocument();
  });
});
