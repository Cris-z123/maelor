import React, { useState } from 'react'
import { invoke } from '@renderer/services/ipc'

export function WelcomeScreen(): React.ReactElement {
  const [loading, setLoading] = useState(false)

  const handleAcknowledge = async () => {
    try {
      setLoading(true)
      await invoke('onboarding:request-permissions', {})
    } catch (error) {
      console.error('Failed to request permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main aria-label="onboarding-wizard">
      <h1>欢迎使用邮件助手</h1>
      <p>智能邮件分析和管理工具</p>
      {loading && <span role="status">正在请求文件系统访问权限...</span>}
      <button
        aria-label="开始设置向导"
        onClick={handleAcknowledge}
        disabled={loading}
      >
        {loading ? '正在请求权限...' : '我知道了'}
      </button>
    </main>
  )
}
