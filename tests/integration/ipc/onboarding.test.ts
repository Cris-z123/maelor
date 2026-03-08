/**
 * Onboarding IPC Integration Tests (T020)
 *
 * Tests for onboarding IPC channels:
 * - onboarding:get-status
 * - onboarding:set-step
 * - onboarding:detect-email-client
 * - onboarding:validate-email-path
 * - onboarding:test-llm-connection
 *
 * Mocking strategy: Mock OnboardingManager at handler level for fast, focused IPC testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock OnboardingManager BEFORE importing handlers
vi.mock('../../../src/main/onboarding/OnboardingManager', () => ({
  default: {
    getStatus: vi.fn(),
    setStep: vi.fn(),
    detectEmailClient: vi.fn(),
    validateEmailPath: vi.fn(),
    testLLMConnection: vi.fn()
  },
  OnboardingManager: {
    getStatus: vi.fn(),
    setStep: vi.fn(),
    detectEmailClient: vi.fn(),
    validateEmailPath: vi.fn(),
    testLLMConnection: vi.fn()
  }
}));

// Import handlers after mocks are set up
// Note: Using relative path since @ alias points to src/main in vitest config
import * as handlers from '../../../src/main/ipc/handlers/onboardingHandler';

describe('Onboarding IPC Channels', () => {
  let mockWebContents: any;
  let mockEvent: any;

  beforeEach(() => {
    mockWebContents = { send: vi.fn() };
    mockEvent = { sender: mockWebContents };
    vi.clearAllMocks();
  });

  it('should have test structure', () => {
    expect(true).toBe(true);
  });

  describe('onboarding:get-status', () => {
    it('should return current onboarding status', async () => {
      const OnboardingManager = await import('../../../src/main/onboarding/OnboardingManager');
      vi.mocked(OnboardingManager.default || OnboardingManager.OnboardingManager).getStatus.mockResolvedValue({
        completed: false,
        currentStep: 'email-client',
        totalSteps: 3
      });

      const result = await handlers.handleGetStatusV2(mockEvent);

      expect(result).toEqual({
        completed: false,
        currentStep: 'email-client',
        totalSteps: 3
      });
    });
  });

  describe('onboarding:set-step', () => {
    it('should reject invalid step names', async () => {
      await expect(
        handlers.handleSetStepV2(mockEvent, 'invalid-step')
      ).rejects.toThrow('Invalid onboarding step');
    });
  });

  describe('onboarding:detect-email-client', () => {
    it('should auto-detect email clients on current platform', async () => {
      const OnboardingManager = await import('../../../src/main/onboarding/OnboardingManager');
      vi.mocked(OnboardingManager.default || OnboardingManager.OnboardingManager).detectEmailClient.mockResolvedValue({
        clients: [
          { type: 'thunderbird', path: 'C:\\Thunderbird', confidence: 'high' }
        ],
        platform: process.platform
      });

      const result = await handlers.handleDetectEmailClientV2(mockEvent);

      expect(result.clients).toHaveLength(1);
      expect(result.clients[0].type).toBe('thunderbird');
      expect(result.platform).toBe(process.platform);
    });
  });

  describe('onboarding:validate-email-path', () => {
    it('should validate valid email client path', async () => {
      const OnboardingManager = await import('../../../src/main/onboarding/OnboardingManager');
      vi.mocked(OnboardingManager.default || OnboardingManager.OnboardingManager).validateEmailPath.mockResolvedValue({
        valid: true,
        clientType: 'thunderbird',
        path: '/valid/path'
      });

      const result = await handlers.handleValidateEmailPathV2(
        mockEvent,
        '/valid/path',
        'thunderbird'
      );

      expect(result.valid).toBe(true);
      expect(result.clientType).toBe('thunderbird');
    });
  });

  describe('onboarding:test-llm-connection', () => {
    it('should successfully test remote LLM connection', async () => {
      const OnboardingManager = await import('../../../src/main/onboarding/OnboardingManager');
      vi.mocked(OnboardingManager.default || OnboardingManager.OnboardingManager).testLLMConnection.mockResolvedValue({
        success: true,
        responseTime: 150,
        model: 'gpt-4'
      });

      const result = await handlers.handleTestLLMConnectionV2(mockEvent, {
        mode: 'remote',
        endpoint: 'https://api.openai.com/v1',
        apiKey: 'test-key'
      });

      expect(result.success).toBe(true);
      expect(result.responseTime).toBe(150);
    }, 35000);
  });
});
