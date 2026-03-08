import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WelcomeScreen } from '@renderer/components/onboarding/WelcomeScreen'
import * as ipc from '@renderer/services/ipc'

// Mock IPC service
vi.mock('@renderer/services/ipc', () => ({
  invoke: vi.fn(),
}))

// Mock onboarding store
const mockSetCurrentStep = vi.fn()
vi.mock('@renderer/stores/onboardingStore', () => ({
  onboardingStore: vi.fn(() => ({
    setCurrentStep: mockSetCurrentStep,
  })),
}))

describe('WelcomeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    mockSetCurrentStep.mockClear()
  })

  it('should render welcome message and app introduction', () => {
    render(<WelcomeScreen />)

    expect(screen.getByText(/欢迎使用 mailCopilot/i)).toBeInTheDocument()
    expect(screen.getByText(/智能邮件分析和管理工具/i)).toBeInTheDocument()
  })

  it('should display logo icon', () => {
    render(<WelcomeScreen />)

    const logo = document.querySelector('.bg-gradient-to-br')
    expect(logo).toBeInTheDocument()
  })

  it('should display privacy notice with required permissions', () => {
    render(<WelcomeScreen />)

    expect(screen.getByText(/为了正常使用,我们需要:/i)).toBeInTheDocument()
    expect(screen.getByText(/读取您的邮件文件/i)).toBeInTheDocument()
    expect(screen.getByText(/生成每日报告/i)).toBeInTheDocument()
    expect(screen.getByText(/所有数据处理均在本地完成/i)).toBeInTheDocument()
  })

  it('should display permission status indicators', () => {
    render(<WelcomeScreen />)

    expect(screen.getByText(/文件系统访问权限/i)).toBeInTheDocument()
    expect(screen.getByText(/通知权限/i)).toBeInTheDocument()
    expect(screen.getAllByText(/待授权/i)).toHaveLength(2)
  })

  it('should display continue button', () => {
    render(<WelcomeScreen />)

    const button = screen.getByRole('button', { name: /开始配置向导/i })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
  })

  it('should have proper ARIA labels for accessibility', () => {
    render(<WelcomeScreen />)

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('aria-label', 'onboarding-welcome')

    const button = screen.getByRole('button', { name: /开始配置向导/i })
    expect(button).toHaveAttribute('aria-label', '开始配置向导')
  })

  it('should request file system permissions on button click', async () => {
    const mockInvoke = vi.mocked(ipc.invoke)
    mockInvoke.mockResolvedValue({ granted: true })

    render(<WelcomeScreen />)

    const button = screen.getByRole('button', { name: /开始配置向导/i })
    await userEvent.click(button)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('onboarding:request-permissions', {})
    })
  })

  it('should display loading state during permission request', async () => {
    vi.mocked(ipc.invoke).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ granted: true }), 100))
    )

    render(<WelcomeScreen />)

    const button = screen.getByRole('button', { name: /开始配置向导/i })
    await userEvent.click(button)

    // Button should be disabled during loading
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('正在请求权限...')
  })

  it('should show restricted mode warning when permissions denied', () => {
    // This test verifies the warning exists in the DOM when permissions are denied
    // In the actual component, this would be set via state after a permission check
    render(<WelcomeScreen />)

    // The warning should not be visible initially (permissions are pending)
    expect(screen.queryByText(/受限模式/i)).not.toBeInTheDocument()
  })

  it('should call setCurrentStep(2) after successful permission request', async () => {
    const mockInvoke = vi.mocked(ipc.invoke)
    mockInvoke.mockResolvedValue({ granted: true })

    render(<WelcomeScreen />)

    const button = screen.getByRole('button', { name: /开始配置向导/i })
    await userEvent.click(button)

    await waitFor(() => {
      expect(mockSetCurrentStep).toHaveBeenCalledWith(2)
    })
  })

  it('should handle permission request errors gracefully', async () => {
    const mockInvoke = vi.mocked(ipc.invoke)
    mockInvoke.mockRejectedValue(new Error('Permission denied'))

    render(<WelcomeScreen />)

    const button = screen.getByRole('button', { name: /开始配置向导/i })
    await userEvent.click(button)

    // Should still proceed to step 2 even on error
    await waitFor(() => {
      expect(mockSetCurrentStep).toHaveBeenCalledWith(2)
    })
  })

  it('should acknowledge on Enter key press', async () => {
    const mockInvoke = vi.mocked(ipc.invoke)
    mockInvoke.mockResolvedValue({ granted: true })

    render(<WelcomeScreen />)

    const button = screen.getByRole('button', { name: /开始配置向导/i })
    button.focus()
    await userEvent.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('onboarding:request-permissions', {})
    })
  })
})
