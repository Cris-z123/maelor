/**
 * WelcomeScreen
 *
 * First screen of onboarding wizard.
 * Requests file system and notification permissions.
 * Shows app introduction and privacy-first messaging.
 *
 * Per design doc Section 4.1, T023
 */

import React, { useState } from 'react';
import { invoke } from '@renderer/services/ipc';
import { onboardingStore } from '@renderer/stores/onboardingStore';

interface PermissionStatus {
  fileSystem: 'granted' | 'denied' | 'pending';
  notifications: 'granted' | 'denied' | 'pending';
}

export function WelcomeScreen(): React.ReactElement {
  const [permissions] = useState<PermissionStatus>({
    fileSystem: 'pending',
    notifications: 'pending',
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const { setCurrentStep } = onboardingStore();

  const handleAcknowledge = async () => {
    setIsRequesting(true);

    try {
      // Request file system and notification permissions
      await invoke('onboarding:request-permissions', {});

      // Move to next step
      setCurrentStep(2);
    } catch (error) {
      console.error('Failed to request permissions:', error);
      // On error, still allow proceeding to step 2
      setCurrentStep(2);
    } finally {
      setIsRequesting(false);
    }
  };

  const canProceed = permissions.fileSystem === 'granted' || permissions.fileSystem === 'pending';

  return (
    <main
      className="flex flex-col items-center justify-center min-h-screen px-8 py-12"
      aria-label="onboarding-welcome"
    >
      {/* Logo/Icon */}
      <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-white"
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

      <h1 className="text-3xl font-semibold text-gray-900 mb-2">
        欢迎使用 mailCopilot
      </h1>
      <p className="text-lg text-gray-600 mb-8">智能邮件分析和管理工具</p>

      {/* Privacy notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 max-w-md">
        <p className="text-sm text-gray-700 mb-4">为了正常使用,我们需要:</p>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <svg
              className="w-5 h-5 text-green-500 mr-2 flex-shrink-0"
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
            <span>读取您的邮件文件</span>
          </li>
          <li className="flex items-start">
            <svg
              className="w-5 h-5 text-green-500 mr-2 flex-shrink-0"
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
            <span>生成每日报告</span>
          </li>
          <li className="flex items-start">
            <svg
              className="w-5 h-5 text-green-500 mr-2 flex-shrink-0"
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
            <span>所有数据处理均在本地完成</span>
          </li>
        </ul>
      </div>

      {/* Permission status */}
      <div className="flex gap-4 mb-8">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">文件系统访问权限</div>
          <div className={`text-sm font-medium ${
            permissions.fileSystem === 'granted' ? 'text-green-600' : 'text-gray-600'
          }`}>
            {permissions.fileSystem === 'granted' ? '✓ 已授权' : '待授权'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">通知权限</div>
          <div className={`text-sm font-medium ${
            permissions.notifications === 'granted' ? 'text-green-600' : 'text-gray-600'
          }`}>
            {permissions.notifications === 'granted' ? '✓ 已授权' : '待授权'}
          </div>
        </div>
      </div>

      {/* Continue button */}
      <button
        onClick={handleAcknowledge}
        disabled={isRequesting || !canProceed}
        className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        aria-label="开始配置向导"
      >
        {isRequesting ? '正在请求权限...' : '我知道了,开始配置 →'}
      </button>

      {/* Restricted mode warning */}
      {permissions.fileSystem === 'denied' && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ 文件系统权限被拒绝,将进入受限模式。您需要手动输入邮件路径。
          </p>
        </div>
      )}
    </main>
  );
}

export default WelcomeScreen;
