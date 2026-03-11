/**
 * EmailClientConfig Component Tests
 *
 * Test suite for EmailClientConfig component (T024)
 * Tests client type selection, auto-detection, path validation, and UI states
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { EmailClientConfig } from '@renderer/components/onboarding/EmailClientConfig';
import { onboardingStore } from '@renderer/stores/onboardingStore';

// Mock IPC client
vi.mock('@renderer/services/ipc', () => ({
  ipcClient: {
    detectEmailClient: vi.fn(),
    validateEmailPath: vi.fn(),
  },
}));

import { ipcClient } from '@renderer/services/ipc';

describe('EmailClientConfig', () => {
  beforeEach(() => {
    // Reset store state before each test
    onboardingStore.getState().reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    onboardingStore.getState().reset();
  });

  it('should render with default client type (thunderbird)', () => {
    render(<EmailClientConfig />);

    expect(screen.getByText(/配置邮件客户端/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Thunderbird/)).toBeChecked();
    expect(screen.getByLabelText(/Outlook/)).not.toBeChecked();
    expect(screen.getByLabelText(/Apple Mail/)).not.toBeChecked();
  });

  it('should update client type when radio button is clicked', () => {
    render(<EmailClientConfig />);

    const outlookRadio = screen.getByLabelText(/Outlook/);
    fireEvent.click(outlookRadio);

    const state = onboardingStore.getState();
    expect(state.emailClient.type).toBe('outlook');
    expect(outlookRadio).toBeChecked();
  });

  it('should call detectEmailClient on component mount', async () => {
    vi.mocked(ipcClient.detectEmailClient).mockResolvedValue({
      detectedPath: 'C:\\Thunderbird',
      error: undefined,
    });

    render(<EmailClientConfig />);

    await waitFor(() => {
      expect(ipcClient.detectEmailClient).toHaveBeenCalledWith('thunderbird');
    });
  });

  it('should call detectEmailClient when client type changes', async () => {
    vi.mocked(ipcClient.detectEmailClient).mockResolvedValue({
      detectedPath: 'C:\\Outlook',
      error: undefined,
    });

    render(<EmailClientConfig />);

    const outlookRadio = screen.getByLabelText(/Outlook/);
    fireEvent.click(outlookRadio);

    await waitFor(() => {
      expect(ipcClient.detectEmailClient).toHaveBeenCalledWith('outlook');
    });
  });

  it('should show loading state during detection', () => {
    onboardingStore.setState((state) => ({
      emailClient: { ...state.emailClient, isDetecting: true },
    }));

    render(<EmailClientConfig />);

    expect(screen.getByText(/自动检测中/)).toBeInTheDocument();
  });

  it('should show detected path when available', async () => {
    const testPath = '/test/detected/path';

    // Mock IPC to return our test path
    vi.mocked(ipcClient.detectEmailClient).mockResolvedValueOnce({
      detectedPath: testPath,
      error: undefined,
    });

    await act(async () => {
      render(<EmailClientConfig />);
    });

    // Wait for detection to complete
    await waitFor(() => {
      expect(ipcClient.detectEmailClient).toHaveBeenCalledWith('thunderbird');
    });

    // Check for the detection label
    expect(screen.getByText(/检测到:/)).toBeInTheDocument();
    // Check that the path is displayed
    expect(screen.getByText(testPath)).toBeInTheDocument();
  });

  it('should not show detected path while detecting', () => {
    onboardingStore.setState((state) => ({
      emailClient: {
        ...state.emailClient,
        detectedPath: 'C:\\Some\\Path',
        isDetecting: true,
      },
    }));

    render(<EmailClientConfig />);

    expect(screen.queryByText(/Some/)).not.toBeInTheDocument();
    expect(screen.getByText(/自动检测中/)).toBeInTheDocument();
  });

  it('should update path input when user types', async () => {
    render(<EmailClientConfig />);

    const input = screen.getByLabelText(/邮件客户端路径/);
    fireEvent.change(input, { target: { value: 'C:\\Custom\\Path' } });

    await waitFor(() => {
      const state = onboardingStore.getState();
      expect(state.emailClient.path).toBe('C:\\Custom\\Path');
      expect(input).toHaveValue('C:\\Custom\\Path');
    });
  });

  it('should show validation success when path is valid', () => {
    onboardingStore.setState((state) => ({
      emailClient: {
        ...state.emailClient,
        path: 'C:\\Valid\\Path',
        isValid: true,
      },
    }));

    render(<EmailClientConfig />);

    expect(screen.getByText(/路径有效/)).toBeInTheDocument();
  });

  it('should show validation error when path is invalid', () => {
    onboardingStore.setState((state) => ({
      emailClient: {
        ...state.emailClient,
        path: 'C:\\Invalid\\Path',
        isValid: false,
      },
    }));

    render(<EmailClientConfig />);

    expect(screen.getByText(/路径无效或未找到邮件文件/)).toBeInTheDocument();
  });

  it('should not show validation status when path is empty', () => {
    render(<EmailClientConfig />);

    expect(screen.queryByText(/路径有效/)).not.toBeInTheDocument();
    expect(screen.queryByText(/路径无效/)).not.toBeInTheDocument();
  });

  it('should show format hint text', () => {
    render(<EmailClientConfig />);

    expect(screen.getByText(/支持 .msf, .mbx, .mbox 格式/)).toBeInTheDocument();
  });

  it('should have browse button (disabled until IPC handler is added)', () => {
    render(<EmailClientConfig />);

    const browseButton = screen.getByRole('button', { name: /浏览/ });
    expect(browseButton).toBeInTheDocument();
  });

  it('should visually indicate selected client type', () => {
    render(<EmailClientConfig />);

    // Thunderbird should be selected by default with blue border
    const thunderbirdLabel = screen.getByLabelText(/Thunderbird/).closest('label');
    expect(thunderbirdLabel).toHaveClass('border-blue-500', 'bg-blue-50');

    // Outlook should not be selected
    const outlookLabel = screen.getByLabelText(/Outlook/).closest('label');
    expect(outlookLabel).not.toHaveClass('border-blue-500', 'bg-blue-50');
  });

  it('should update visual selection when client type changes', () => {
    render(<EmailClientConfig />);

    const outlookRadio = screen.getByLabelText(/Outlook/);
    fireEvent.click(outlookRadio);

    const outlookLabel = outlookRadio.closest('label');
    expect(outlookLabel).toHaveClass('border-blue-500', 'bg-blue-50');
  });

  it('should handle detection error gracefully', async () => {
    vi.mocked(ipcClient.detectEmailClient).mockResolvedValue({
      detectedPath: null,
      error: 'Detection failed',
    });

    render(<EmailClientConfig />);

    await waitFor(() => {
      const state = onboardingStore.getState();
      expect(state.error).toBe('Detection failed');
      expect(state.emailClient.isDetecting).toBe(false);
    });
  });

  it('should handle detection exception gracefully', async () => {
    vi.mocked(ipcClient.detectEmailClient).mockRejectedValue(
      new Error('Network error')
    );

    render(<EmailClientConfig />);

    await waitFor(() => {
      const state = onboardingStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.emailClient.isDetecting).toBe(false);
    });
  });

  it('should validate path on input change', async () => {
    vi.mocked(ipcClient.validateEmailPath).mockResolvedValue({
      valid: true,
      message: 'Path is valid',
    });

    render(<EmailClientConfig />);

    const input = screen.getByLabelText(/邮件客户端路径/);

    // Trigger input change
    await act(async () => {
      fireEvent.change(input, { target: { value: 'C:\\Test\\Path' } });
    });

    // Wait for debounced validation
    await waitFor(
      () => {
        expect(ipcClient.validateEmailPath).toHaveBeenCalledWith('C:\\Test\\Path');
      },
      { timeout: 1000 }
    );
  });

  it('should show error message from validation', async () => {
    vi.mocked(ipcClient.validateEmailPath).mockResolvedValue({
      valid: false,
      message: 'No email files found',
    });

    render(<EmailClientConfig />);

    const input = screen.getByLabelText(/邮件客户端路径/);
    fireEvent.change(input, { target: { value: 'C:\\Invalid\\Path' } });

    await waitFor(
      () => {
        const state = onboardingStore.getState();
        expect(state.error).toBe('No email files found');
      },
      { timeout: 1000 }
    );
  });
});
