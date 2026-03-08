/**
 * Onboarding Entry Point
 *
 * This is the entry point for the onboarding wizard window.
 * Loaded separately from the main app window.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { OnboardingWizard } from './components/Onboarding/OnboardingWizard';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OnboardingWizard />
  </React.StrictMode>
);
