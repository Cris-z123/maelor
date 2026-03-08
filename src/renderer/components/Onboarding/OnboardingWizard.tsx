/**
* OnboardingWizard
*
* Container component for 3-step onboarding wizard.
* Handles step navigation, progress indicator, validation, and completion.
*
* Per design doc Section 3.2, T030
*/

import React from 'react';
import { onboardingStore } from '@renderer/stores/onboardingStore';
import { EmailClientConfig } from './EmailClientConfig';
import { ScheduleConfig } from './ScheduleConfig';
import { LLMConfig } from './LLMConfig';

export function OnboardingWizard(): React.ReactElement {
  const { currentStep, isComplete, emailClient, llm, setCurrentStep, completeOnboarding } =
    onboardingStore();

  // Validate if can proceed to next step
  const canProceedToStep2 = emailClient.isValid;
  const canProceedToStep3 = canProceedToStep2; // Schedule always valid
  const canComplete = llm.connectionStatus === 'success';

  const handleNext = async () => {
    if (currentStep === 1 && !canProceedToStep2) return;
    if (currentStep === 2 && !canProceedToStep3) return;
    if (currentStep === 3) {
      await handleComplete();
      return;
    }

    setCurrentStep((currentStep + 1) as 1 | 2 | 3);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2 | 3);
    }
  };

  const handleComplete = async () => {
    if (!canComplete) return;

    await completeOnboarding();

    // Note: Navigation will be handled by parent component or window management
    // This component just sets the completion state
  };

  const getProgress = () => {
    return Math.round((currentStep / 3) * 100);
  };

  // If completed, render nothing (parent will handle navigation)
  if (isComplete) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-gray-900">
              mailCopilot 初始配置
            </h1>
            <span className="text-sm text-gray-600">
              Step {currentStep}/3
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: getProgress() + "%" }}
              role="progressbar"
              aria-valuenow={getProgress()}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        {currentStep === 1 && <EmailClientConfig />}
        {currentStep === 2 && <ScheduleConfig />}
        {currentStep === 3 && <LLMConfig />}
      </div>

      {/* Navigation buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-8 py-4 flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            上一步
          </button>
          <button
            onClick={handleNext}
            disabled={
              (currentStep === 1 && !canProceedToStep2) ||
              (currentStep === 3 && !canComplete)
            }
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            {currentStep === 3 ? '完成' : '下一步'}
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts hint (screen reader only) */}
      <div className="sr-only">
        <p>按 Esc 退出向导</p>
        <p>按 Enter 进入下一步</p>
      </div>
    </div>
  );
}

export default OnboardingWizard;
