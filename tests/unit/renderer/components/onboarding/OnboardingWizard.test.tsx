/**
 * OnboardingWizard Component Tests
 *
 * Tests the container component for the 3-step onboarding wizard.
 * Per T030 implementation plan.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OnboardingWizard } from '@renderer/components/onboarding/OnboardingWizard';

// Mock the onboarding store
const mockSetCurrentStep = vi.fn();
const mockCompleteOnboarding = vi.fn();

vi.mock('@renderer/stores/onboardingStore', () => ({
  onboardingStore: vi.fn(() => ({
    currentStep: 1,
    isComplete: false,
    emailClient: { isValid: false, isDetecting: false },
    schedule: { hour: 18, minute: 0, skipWeekends: true },
    llm: { connectionStatus: 'idle' as const, isTesting: false },
    setCurrentStep: mockSetCurrentStep,
    completeOnboarding: mockCompleteOnboarding,
  })),
}));

// Mock step components
vi.mock('@renderer/components/Onboarding/EmailClientConfig', () => ({
  EmailClientConfig: () => <div data-testid="email-client-config">Email Client Config</div>,
}));

vi.mock('@renderer/components/Onboarding/ScheduleConfig', () => ({
  ScheduleConfig: () => <div data-testid="schedule-config">Schedule Config</div>,
}));

vi.mock('@renderer/components/Onboarding/LLMConfig', () => ({
  LLMConfig: () => <div data-testid="llm-config">LLM Config</div>,
}));

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render step 1 by default', () => {
    render(<OnboardingWizard />);

    expect(screen.getByTestId('email-client-config')).toBeInTheDocument();
    expect(screen.getByText(/Step 1\/3/)).toBeInTheDocument();
    expect(screen.getByText(/mailCopilot 初始配置/)).toBeInTheDocument();
  });

  it('should disable next button when step validation fails', () => {
    render(<OnboardingWizard />);

    const nextButton = screen.getByRole('button', { name: /下一步/ });
    expect(nextButton).toBeDisabled();
  });

  it('should disable back button on step 1', () => {
    render(<OnboardingWizard />);

    const backButton = screen.getByRole('button', { name: /上一步/ });
    expect(backButton).toBeDisabled();
  });

  it('should show progress bar with correct percentage', () => {
    render(<OnboardingWizard />);

    // Step 1 should show 33% progress
    const progressBar = document.querySelector('.bg-blue-600') as HTMLElement;
    expect(progressBar).toHaveStyle({ width: '33%' });
  });

});
