import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WelcomeScreen } from '@renderer/components/onboarding/WelcomeScreen'
import * as ipc from '@renderer/services/ipc'

// Mock IPC service
vi.mock('@renderer/services/ipc', () => ({
  send: vi.fn(),
  invoke: vi.fn()
}))

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}))

describe('WelcomeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('should render welcome message and app introduction', () => {
    render(<WelcomeScreen />)

    expect(screen.getByText(/欢迎使用邮件助手/i)).toBeInTheDocument()
    expect(screen.getByText(/智能邮件分析/i)).toBeInTheDocument()
  })

  it('should display acknowledgment button', () => {
    render(<WelcomeScreen />)

    const button = screen.getByRole('button', { name: /我知道了|开始设置/i })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
  })

  it('should have proper ARIA labels for accessibility', () => {
    render(<WelcomeScreen />)

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('aria-label', 'onboarding-wizard')

    const button = screen.getByRole('button', { name: /我知道了|开始设置/i })
    expect(button).toHaveAttribute('aria-label')
  })

  it('should request file system permissions on acknowledge button click', async () => {
    vi.mocked(ipc.invoke).mockResolvedValue({ granted: true })

    render(<WelcomeScreen />)

    const button = screen.getByRole('button', { name: /我知道了|开始设置/i })
    await userEvent.click(button)

    expect(ipc.invoke).toHaveBeenCalledWith('onboarding:request-permissions', {})
  })

  it('should display loading state during permission request', async () => {
    vi.mocked(ipc.invoke).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ granted: true }), 100))
    )

    render(<WelcomeScreen />)

    const button = screen.getByRole('button', { name: /开始设置向导/i })
    await userEvent.click(button)

    // Button should be disabled during loading
    expect(button).toBeDisabled()

    // Status element should be present
    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(status).toHaveTextContent(/正在请求/i)
  })

  it('should acknowledge on Enter key press', async () => {
    vi.mocked(ipc.invoke).mockResolvedValue({ granted: true })

    render(<WelcomeScreen />)

    const button = screen.getByRole('button', { name: /开始设置向导/i })
    button.focus()
    await userEvent.keyboard('{Enter}')

    expect(ipc.invoke).toHaveBeenCalledWith('onboarding:request-permissions', {})
  })
})
