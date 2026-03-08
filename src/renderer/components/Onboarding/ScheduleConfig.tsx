/**
 * ScheduleConfig
 *
 * Step 2 of onboarding wizard.
 * Daily report generation schedule configuration.
 *
 * Per design doc Section 4.3, T025
 */

import React from 'react'
import { onboardingStore } from '@renderer/stores/onboardingStore'

export function ScheduleConfig(): React.ReactElement {
  const { schedule, setScheduleTime, setSkipWeekends } = onboardingStore()

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          配置每日报告生成规则
        </h2>
        <p className="text-gray-600">设置系统自动生成报告的时间</p>
      </div>

      {/* Time selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          每日生成时间:
        </label>
        <div className="flex items-center gap-2">
          {/* Hour selector */}
          <div className="relative">
            <select
              value={schedule.hour}
              onChange={(e) =>
                setScheduleTime(parseInt(e.target.value), schedule.minute)
              }
              className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
              aria-label="小时"
            >
              {hours.map((hour) => (
                <option key={hour} value={hour}>
                  {hour.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
            <svg
              className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          <span className="text-2xl text-gray-500">:</span>

          {/* Minute selector */}
          <div className="relative">
            <select
              value={schedule.minute}
              onChange={(e) =>
                setScheduleTime(schedule.hour, parseInt(e.target.value))
              }
              className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
              aria-label="分钟"
            >
              {minutes.map((minute) => (
                <option key={minute} value={minute}>
                  {minute.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
            <svg
              className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Skip weekends checkbox */}
      <div className="mb-8">
        <label className="flex items-start cursor-pointer">
          <input
            type="checkbox"
            checked={schedule.skipWeekends}
            onChange={(e) => setSkipWeekends(e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-3 text-sm text-gray-700">跳过周六日</span>
        </label>
        <p className="ml-7 mt-1 text-xs text-gray-500">
          [i] 周六日判定基于本地系统时间
        </p>
      </div>

      {/* Preview */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-600 mb-1">预览:</p>
        <p className="text-sm font-medium text-gray-900">
          系统将在每天 {schedule.hour.toString().padStart(2, '0')}:
          {schedule.minute.toString().padStart(2, '0')} 自动生成报告
          {schedule.skipWeekends && ' (周六日除外)'}
        </p>
      </div>
    </div>
  )
}

export default ScheduleConfig
