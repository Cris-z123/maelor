/**
 * LLMConfig
 *
 * Step 3 of onboarding wizard.
 * AI mode selection, endpoint configuration, and connection testing.
 *
 * Per design doc Section 4.4, T026
 */

import React, { useState } from 'react';
import { onboardingStore } from '@renderer/stores/onboardingStore';

export function LLMConfig(): React.ReactElement {
  const { llm, setLLMMode, setLLMEndpoint, setAPIKey, testLLMConnection } =
    onboardingStore();
  const [showApiKey, setShowApiKey] = useState(false);

  const handleModeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newMode = event.target.value as 'local' | 'remote';
    setLLMMode(newMode);
  };

  const handleEndpointChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLLMEndpoint(event.target.value);
  };

  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAPIKey(event.target.value);
  };

  const handleTestConnection = async () => {
    await testLLMConnection();
  };

  const canTestConnection =
    (llm.mode === 'remote' && llm.apiKey.length >= 20) ||
    (llm.mode === 'local' && llm.localEndpoint.length > 0);

  const connectionStatusColor = {
    idle: 'text-gray-600',
    testing: 'text-blue-600',
    success: 'text-green-600',
    failed: 'text-red-600',
  }[llm.connectionStatus];

  const connectionStatusText = {
    idle: '未测试',
    testing: '测试中...',
    success: llm.responseTime
      ? `连接成功 (${llm.responseTime}ms)`
      : '连接成功',
    failed: '连接失败',
  }[llm.connectionStatus];

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
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          选择AI处理模式
        </h2>
        <p className="text-gray-600">配置AI服务以处理邮件分析</p>
      </div>

      {/* Mode selection */}
      <div className="mb-6">
        <div className="flex gap-4">
          <label
            className={`flex-1 flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-colors ${
              llm.mode === 'remote'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              type="radio"
              name="llm-mode"
              value="remote"
              checked={llm.mode === 'remote'}
              onChange={handleModeChange}
              className="sr-only"
              aria-label="远程模式"
            />
            <span className="text-sm font-medium">远程模式 (推荐)</span>
          </label>
          <label
            className={`flex-1 flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-colors ${
              llm.mode === 'local'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              type="radio"
              name="llm-mode"
              value="local"
              checked={llm.mode === 'local'}
              onChange={handleModeChange}
              className="sr-only"
              aria-label="本地模式"
            />
            <span className="text-sm font-medium">本地模式</span>
          </label>
        </div>
      </div>

      {/* Endpoint configuration */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          API地址:
        </label>
        <input
          type="text"
          value={
            llm.mode === 'remote'
              ? llm.remoteEndpoint
              : llm.localEndpoint
          }
          onChange={handleEndpointChange}
          placeholder={
            llm.mode === 'remote'
              ? 'https://api.openai.com/v1'
              : 'http://localhost:11434'
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          aria-label="API地址"
        />
      </div>

      {/* API key input (remote mode only) */}
      {llm.mode === 'remote' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API密钥:
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={llm.apiKey}
              onChange={handleApiKeyChange}
              placeholder="sk-..."
              className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              aria-label="API密钥"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              aria-label={showApiKey ? '隐藏密钥' : '显示密钥'}
            >
              {showApiKey ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Test connection button */}
      <div className="mb-4">
        <button
          onClick={handleTestConnection}
          disabled={!canTestConnection || llm.isTesting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {llm.isTesting ? '测试中...' : '测试连接'}
        </button>
      </div>

      {/* Connection status */}
      {llm.connectionStatus !== 'idle' && (
        <div className="mb-4 flex items-center">
          {llm.connectionStatus === 'testing' && (
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
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
          )}
          {llm.connectionStatus === 'success' && (
            <svg
              className="w-4 h-4 mr-2"
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
          )}
          {llm.connectionStatus === 'failed' && (
            <svg
              className="w-4 h-4 mr-2"
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
          )}
          <span className={`text-sm font-medium ${connectionStatusColor}`}>
            状态: {connectionStatusText}
          </span>
        </div>
      )}

      {/* Privacy notice */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs text-gray-600">
          您的密钥将被加密存储在本地
        </p>
      </div>
    </div>
  );
}

export default LLMConfig;
