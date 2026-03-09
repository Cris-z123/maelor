import React from 'react';
import { EmptyState } from '../shared/EmptyState';

interface CelebratoryEmptyStateProps {
  scheduledTime: string;
}

export function CelebratoryEmptyState({ scheduledTime: _scheduledTime }: CelebratoryEmptyStateProps) {
  return (
    <EmptyState
      variant="celebratory"
      icon="🎉"
      title="太棒了！"
      message="AI 未发现任何急需处理的杂事"
      submessage="今日份的邮件已全部化解。享受你的专注时光吧！"
    />
  );
}
