import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ScheduleConfig } from '@renderer/components/onboarding/ScheduleConfig'
import * as onboardingStore from '@renderer/stores/onboardingStore'

// Mock onboardingStore
const mockSetScheduleTime = vi.fn()
const mockSetSkipWeekends = vi.fn()

vi.mock('@renderer/stores/onboardingStore', () => ({
  onboardingStore: vi.fn(() => ({
    schedule: { hour: 18, minute: 0, skipWeekends: true },
    setScheduleTime: mockSetScheduleTime,
    setSkipWeekends: mockSetSkipWeekends,
  })),
}))

describe('ScheduleConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with default time 18:00', () => {
    render(<ScheduleConfig />)

    expect(screen.getByText(/配置每日报告生成规则/)).toBeInTheDocument()
    expect(screen.getByDisplayValue('18')).toBeInTheDocument()
    expect(screen.getByDisplayValue('00')).toBeInTheDocument()
  })

  it('should call setScheduleTime when hour changes', () => {
    render(<ScheduleConfig />)

    const hourSelect = screen.getByLabelText(/小时/)
    fireEvent.change(hourSelect, { target: { value: '9' } })

    expect(mockSetScheduleTime).toHaveBeenCalledWith(9, 0)
  })

  it('should toggle skip weekends', () => {
    render(<ScheduleConfig />)

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(mockSetSkipWeekends).toHaveBeenCalledWith(false)
  })

  it('should show preview with correct time', () => {
    render(<ScheduleConfig />)

    expect(
      screen.getByText(/系统将在每天 18:00 自动生成报告/)
    ).toBeInTheDocument()
  })

  it('should show preview without weekends when skip is enabled', () => {
    render(<ScheduleConfig />)

    expect(screen.getByText(/\(周六日除外\)/)).toBeInTheDocument()
  })

  it('should call setScheduleTime when minute changes', () => {
    render(<ScheduleConfig />)

    const minuteSelect = screen.getByLabelText(/分钟/)
    fireEvent.change(minuteSelect, { target: { value: '30' } })

    expect(mockSetScheduleTime).toHaveBeenCalledWith(18, 30)
  })

  it('should have proper ARIA labels for accessibility', () => {
    render(<ScheduleConfig />)

    const hourSelect = screen.getByLabelText(/小时/)
    const minuteSelect = screen.getByLabelText(/分钟/)
    const checkbox = screen.getByRole('checkbox', { name: /跳过周六日/ })

    expect(hourSelect).toBeInTheDocument()
    expect(minuteSelect).toBeInTheDocument()
    expect(checkbox).toBeInTheDocument()
  })

  it('should render all 24 hours in dropdown', () => {
    render(<ScheduleConfig />)

    const hourSelect = screen.getByLabelText(/小时/)
    const options = Array.from(hourSelect.querySelectorAll('option'))

    expect(options).toHaveLength(24)
    expect(options[0]).toHaveValue('0')
    expect(options[23]).toHaveValue('23')
  })

  it('should render all 60 minutes in dropdown', () => {
    render(<ScheduleConfig />)

    const minuteSelect = screen.getByLabelText(/分钟/)
    const options = Array.from(minuteSelect.querySelectorAll('option'))

    expect(options).toHaveLength(60)
    expect(options[0]).toHaveValue('0')
    expect(options[59]).toHaveValue('59')
  })

  it('should format time with leading zeros', () => {
    render(<ScheduleConfig />)

    const hourSelect = screen.getByLabelText(/小时/)
    const options = Array.from(hourSelect.querySelectorAll('option'))

    expect(options[0].textContent).toBe('00')
    expect(options[9].textContent).toBe('09')
  })

  it('should display checkbox as checked by default', () => {
    render(<ScheduleConfig />)

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })
})
