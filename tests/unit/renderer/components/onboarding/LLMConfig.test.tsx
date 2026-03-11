/**
 * Tests for LLMConfig component
 *
 * Per T026, Task 9
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LLMConfig } from '@renderer/components/onboarding/LLMConfig';
import { onboardingStore } from '@renderer/stores/onboardingStore';
import { ipcClient } from '@renderer/services/ipc';

// Mock IPC client
vi.mock('@renderer/services/ipc', () => ({
  ipcClient: {
    detectEmailClient: vi.fn(),
    validateEmailPath: vi.fn(),
    testLLMConnection: vi.fn(),
    setOnboardingStep: vi.fn(),
  },
}));

describe('LLMConfig', () => {
  beforeEach(() => {
    // Reset store before each test
    onboardingStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('mode switch', () => {
    it('should render with remote mode selected by default', () => {
      render(<LLMConfig />);

      const remoteRadio = screen.getByDisplayValue('remote');
      const localRadio = screen.getByDisplayValue('local');

      expect(remoteRadio).toBeChecked();
      expect(localRadio).not.toBeChecked();
    });

    it('should call setLLMMode when mode is changed to local', () => {
      render(<LLMConfig />);

      const localRadio = screen.getByDisplayValue('local');
      fireEvent.click(localRadio);

      const state = onboardingStore.getState();
      expect(state.llm.mode).toBe('local');
    });

    it('should call setLLMMode when mode is changed to remote', () => {
      onboardingStore.getState().setLLMMode('local');

      render(<LLMConfig />);

      const remoteRadio = screen.getByDisplayValue('remote');
      fireEvent.click(remoteRadio);

      const state = onboardingStore.getState();
      expect(state.llm.mode).toBe('remote');
    });

    it('should update endpoint input when mode changes', () => {
      render(<LLMConfig />);

      // Should show remote endpoint by default
      const endpointInput = screen.getByLabelText(/API地址/);
      expect(endpointInput).toHaveValue('https://api.openai.com/v1');

      // Switch to local mode
      const localRadio = screen.getByDisplayValue('local');
      fireEvent.click(localRadio);

      // Should show local endpoint
      expect(endpointInput).toHaveValue('http://localhost:11434');
    });
  });

  describe('endpoint input', () => {
    it('should render with default remote endpoint', () => {
      render(<LLMConfig />);

      const endpointInput = screen.getByLabelText(/API地址/);
      expect(endpointInput).toHaveValue('https://api.openai.com/v1');
    });

    it('should call setLLMEndpoint when endpoint changes', () => {
      render(<LLMConfig />);

      const endpointInput = screen.getByLabelText(/API地址/);
      fireEvent.change(endpointInput, {
        target: { value: 'https://api.custom.com/v1' },
      });

      const state = onboardingStore.getState();
      expect(state.llm.remoteEndpoint).toBe('https://api.custom.com/v1');
    });

    it('should update local endpoint in local mode', () => {
      onboardingStore.getState().setLLMMode('local');

      render(<LLMConfig />);

      const endpointInput = screen.getByLabelText(/API地址/);
      fireEvent.change(endpointInput, {
        target: { value: 'http://localhost:8080' },
      });

      const state = onboardingStore.getState();
      expect(state.llm.localEndpoint).toBe('http://localhost:8080');
    });
  });

  describe('API key input', () => {
    it('should show API key input in remote mode', () => {
      render(<LLMConfig />);

      const apiKeyInput = screen.getByLabelText(/API密钥/);
      expect(apiKeyInput).toBeInTheDocument();
      expect(apiKeyInput).toHaveAttribute('type', 'password');
    });

    it('should hide API key input in local mode', () => {
      onboardingStore.getState().setLLMMode('local');

      render(<LLMConfig />);

      const apiKeyInput = screen.queryByLabelText(/API密钥/);
      expect(apiKeyInput).not.toBeInTheDocument();
    });

    it('should call setAPIKey when API key changes', () => {
      render(<LLMConfig />);

      const apiKeyInput = screen.getByLabelText(/API密钥/);
      fireEvent.change(apiKeyInput, {
        target: { value: 'sk-test-key-with-at-least-20-chars' },
      });

      const state = onboardingStore.getState();
      expect(state.llm.apiKey).toBe('sk-test-key-with-at-least-20-chars');
    });

    it('should toggle API key visibility when show/hide button is clicked', () => {
      render(<LLMConfig />);

      const apiKeyInput = screen.getByLabelText(/API密钥/);
      const toggleButton = screen.getByLabelText(/显示密钥/);

      // Initially hidden
      expect(apiKeyInput).toHaveAttribute('type', 'password');

      // Click to show
      fireEvent.click(toggleButton);
      expect(apiKeyInput).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/隐藏密钥/)).toBeInTheDocument();

      // Click to hide again
      fireEvent.click(toggleButton);
      expect(apiKeyInput).toHaveAttribute('type', 'password');
    });
  });

  describe('test connection button', () => {
    it('should disable test button when API key is too short in remote mode', () => {
      render(<LLMConfig />);

      const testButton = screen.getByRole('button', { name: /测试连接/ });
      expect(testButton).toBeDisabled();
    });

    it('should enable test button when API key is valid in remote mode', () => {
      onboardingStore.getState().setAPIKey('sk-test-key-with-at-least-20-chars');

      render(<LLMConfig />);

      const testButton = screen.getByRole('button', { name: /测试连接/ });
      expect(testButton).not.toBeDisabled();
    });

    it('should enable test button in local mode without API key', () => {
      onboardingStore.getState().setLLMMode('local');

      render(<LLMConfig />);

      const testButton = screen.getByRole('button', { name: /测试连接/ });
      expect(testButton).not.toBeDisabled();
    });

    it('should show loading state while testing', async () => {
      onboardingStore.getState().setAPIKey('sk-test-key-with-at-least-20-chars');

      vi.mocked(ipcClient.testLLMConnection).mockImplementation(
        () => new Promise((resolve) => {
          setTimeout(() => resolve({ success: true, responseTime: 234 }), 100);
        })
      );

      render(<LLMConfig />);

      const testButton = screen.getByRole('button', { name: /测试连接/ });
      fireEvent.click(testButton);

      // Should show loading state in status
      expect(screen.getByText(/状态: 测试中\.\.\./)).toBeInTheDocument();
    });

    it('should call testLLMConnection when test button is clicked', async () => {
      onboardingStore.getState().setAPIKey('sk-test-key-with-at-least-20-chars');
      vi.mocked(ipcClient.testLLMConnection).mockResolvedValue({
        success: true,
        responseTime: 234,
      });

      render(<LLMConfig />);

      const testButton = screen.getByRole('button', { name: /测试连接/ });

      await act(async () => {
        fireEvent.click(testButton);
        // Wait for async operation
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      expect(ipcClient.testLLMConnection).toHaveBeenCalledWith({
        mode: 'remote',
        localEndpoint: 'http://localhost:11434',
        remoteEndpoint: 'https://api.openai.com/v1',
        apiKey: 'sk-test-key-with-at-least-20-chars',
      });
    });
  });

  describe('connection status display', () => {
    it('should not show status when idle', () => {
      render(<LLMConfig />);

      const statusElement = screen.queryByTestId(/connection-status/);
      expect(statusElement).not.toBeInTheDocument();
    });

    it('should show testing status with spinner', () => {
      onboardingStore.setState((state) => ({
        llm: { ...state.llm, isTesting: true, connectionStatus: 'testing' },
      }));

      render(<LLMConfig />);

      expect(screen.getByText(/状态: 测试中\.\.\./)).toBeInTheDocument();
    });

    it('should show success status with response time', () => {
      onboardingStore.setState((state) => ({
        llm: {
          ...state.llm,
          connectionStatus: 'success',
          responseTime: 234,
        },
      }));

      render(<LLMConfig />);

      expect(screen.getByText(/状态: 连接成功 \(234ms\)/)).toBeInTheDocument();
    });

    it('should show success status without response time', () => {
      onboardingStore.setState((state) => ({
        llm: {
          ...state.llm,
          connectionStatus: 'success',
          responseTime: undefined,
        },
      }));

      render(<LLMConfig />);

      expect(screen.getByText(/状态: 连接成功/)).toBeInTheDocument();
    });

    it('should show failed status', () => {
      onboardingStore.setState((state) => ({
        llm: {
          ...state.llm,
          connectionStatus: 'failed',
        },
      }));

      render(<LLMConfig />);

      expect(screen.getByText(/状态: 连接失败/)).toBeInTheDocument();
    });

    it('should display status with correct colors', () => {
      // Test success color
      onboardingStore.setState((state) => ({
        llm: {
          ...state.llm,
          connectionStatus: 'success',
          responseTime: 234,
        },
      }));

      const { rerender } = render(<LLMConfig />);
      const successStatus = screen.getByText(/连接成功/);
      expect(successStatus.className).toContain('text-green-600');

      // Test failed color
      onboardingStore.setState((state) => ({
        llm: {
          ...state.llm,
          connectionStatus: 'failed',
        },
      }));

      rerender(<LLMConfig />);
      const failedStatus = screen.getByText(/连接失败/);
      expect(failedStatus.className).toContain('text-red-600');

      // Test testing color
      onboardingStore.setState((state) => ({
        llm: {
          ...state.llm,
          connectionStatus: 'testing',
        },
      }));

      rerender(<LLMConfig />);
      const testingStatus = screen.getByText(/测试中\.\.\./);
      expect(testingStatus.className).toContain('text-blue-600');
    });
  });

  describe('privacy notice', () => {
    it('should display privacy notice about encryption', () => {
      render(<LLMConfig />);

      expect(
        screen.getByText(/您的密钥将被加密存储在本地/)
      ).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(<LLMConfig />);

      expect(screen.getByLabelText(/API地址/)).toBeInTheDocument();
      expect(screen.getByLabelText(/API密钥/)).toBeInTheDocument();
      expect(screen.getByLabelText(/远程模式/)).toBeInTheDocument();
      expect(screen.getByLabelText(/本地模式/)).toBeInTheDocument();
    });

    it('should have proper aria-labels for buttons', () => {
      render(<LLMConfig />);

      const showButton = screen.getByLabelText(/显示密钥/);
      expect(showButton).toBeInTheDocument();

      const testButton = screen.getByRole('button', { name: /测试连接/ });
      expect(testButton).toBeInTheDocument();
    });
  });
});
