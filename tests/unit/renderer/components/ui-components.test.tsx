import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Calendar } from '@renderer/components/ui/calendar';
import { Input } from '@renderer/components/ui/input';
import { Progress } from '@renderer/components/ui/progress';
import { Toaster } from '@renderer/components/ui/toast';

describe('shadcn/ui Components', () => {
  describe('Calendar', () => {
    it('renders without crashing', () => {
      const { container } = render(<Calendar />);
      expect(container).toBeInTheDocument();
    });

    it('displays current month and year', () => {
      render(<Calendar />);
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(currentMonth, 'i'))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(currentYear.toString(), 'i'))).toBeInTheDocument();
    });
  });

  describe('Input', () => {
    it('renders without crashing', () => {
      render(<Input placeholder="Test input" />);
      expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<Input className="custom-class" />);
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Progress', () => {
    it('renders without crashing', () => {
      const { container } = render(<Progress value={50} />);
      expect(container).toBeInTheDocument();
    });

    it('displays correct value', () => {
      const { container } = render(<Progress value={75} />);
      const progressBar = container.querySelector('.bg-primary');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Toaster', () => {
    it('renders without crashing', () => {
      const { container } = render(<Toaster />);
      expect(container).toBeInTheDocument();
    });
  });
});
