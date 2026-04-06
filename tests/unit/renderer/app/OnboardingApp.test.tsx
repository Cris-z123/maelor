import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@renderer/app/OnboardingFlow', () => ({
    default: () => <div>onboarding-flow-shell</div>,
}));

import OnboardingApp from '@renderer/app/OnboardingApp';

describe('OnboardingApp', () => {
    it('renders the onboarding flow shell', () => {
        render(<OnboardingApp />);

        expect(screen.getByText('onboarding-flow-shell')).toBeInTheDocument();
    });
});
