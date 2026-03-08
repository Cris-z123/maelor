/**
 * EmailClientConfig Component
 *
 * Step 1 of onboarding wizard.
 * Email client selection, auto-detection, and manual path configuration.
 *
 * Per design doc Section 4.2, T024
 */

import React, { useEffect, useRef } from 'react';
import { onboardingStore } from '@renderer/stores/onboardingStore';
import { ipcClient } from '@renderer/services/ipc';

const CLIENT_OPTIONS = [
  { value: 'thunderbird', label: 'Thunderbird' },
  { value: 'outlook', label: 'Outlook' },
  { value: 'apple-mail', label: 'Apple Mail' },
] as const;

export function EmailClientConfig(): React.ReactElement {
  const {
    emailClient,
    setEmailClientType,
    setEmailClientPath,
    validateEmailPath,
  } = onboardingStore();

  const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-detect on component mount or type change
  useEffect(() => {
    const detectClient = async () => {
      // Set detecting state in store
      onboardingStore.setState((prevState) => ({
        emailClient: { ...prevState.emailClient, isDetecting: true },
      }));

      try {
        const result = await ipcClient.detectEmailClient(emailClient.type);

        if (result.detectedPath) {
          onboardingStore.setState((prevState) => ({
            emailClient: {
              ...prevState.emailClient,
              detectedPath: result.detectedPath,
              isDetecting: false,
            },
            error: null,
          }));

          // Auto-validate the detected path
          await validateEmailPath(result.detectedPath);
        } else {
          onboardingStore.setState((prevState) => ({
            emailClient: { ...prevState.emailClient, isDetecting: false },
            error: result.error || 'No email client detected',
          }));
        }
      } catch (error) {
        onboardingStore.setState((prevState) => ({
          emailClient: { ...prevState.emailClient, isDetecting: false },
          error: error instanceof Error ? error.message : 'Detection failed',
        }));
      }
    };

    detectClient();
  }, [emailClient.type, validateEmailPath]);

  const handleTypeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newType = event.target.value as 'thunderbird' | 'outlook' | 'apple-mail';
    setEmailClientType(newType);
  };

  const handlePathChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPath = event.target.value;
    setEmailClientPath(newPath);

    // Debounce validation
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    validationTimerRef.current = setTimeout(async () => {
      if (newPath) {
        await validateEmailPath(newPath);
      }
    }, 500);
  };

  const handleBrowse = async () => {
    // TODO: Implement browse functionality once dialog:open-directory IPC handler is added
    // For now, this is a placeholder that shows the feature is planned
    console.warn('Browse functionality requires dialog:open-directory IPC handler');
    alert('浏览功能需要IPC对话框支持，请手动输入路径。\nBrowse functionality requires IPC dialog support, please enter path manually.');
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="w-12 h-12 mb-4 rounded-full bg-blue-100 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          配置邮件客户端
        </h2>
        <p className="text-gray-600">选择您的邮件客户端以开始分析</p>
      </div>

      {/* Client type selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          选择您的邮件客户端:
        </label>
        <div className="flex gap-4">
          {CLIENT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex-1 flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-colors ${
                emailClient.type === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="email-client-type"
                value={option.value}
                checked={emailClient.type === option.value}
                onChange={handleTypeChange}
                className="sr-only"
                aria-label={option.label}
              />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Auto-detection status */}
      {emailClient.isDetecting && (
        <div className="mb-6 flex items-center text-blue-600">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm">自动检测中...</span>
        </div>
      )}

      {/* Detected path */}
      {emailClient.detectedPath && !emailClient.isDetecting && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 mb-1">
                ✓ 检测到:
              </p>
              <p className="text-sm text-green-700 font-mono break-all">
                {emailClient.detectedPath}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manual path input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          路径:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={emailClient.path}
            onChange={handlePathChange}
            placeholder="手动输入邮件路径或点击浏览"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="邮件客户端路径"
          />
          <button
            onClick={handleBrowse}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            type="button"
          >
            浏览...
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          [i] 支持 .msf, .mbx, .mbox 格式
        </p>
      </div>

      {/* Validation status */}
      {emailClient.path && (
        <div className="mb-4">
          {emailClient.isValid ? (
            <div className="flex items-center text-green-600">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm">路径有效</span>
            </div>
          ) : (
            <div className="flex items-center text-red-600">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span className="text-sm">路径无效或未找到邮件文件</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EmailClientConfig;
