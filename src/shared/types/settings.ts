/**
 * Settings management types
 * Per data-model.md section 6
 */

import { EmailClientConfig, ScheduleConfig, LLMConfig } from './onboarding';

export interface NotificationSettings {
  enabled: boolean;
  doNotDisturb: {
    enabled: boolean;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
  };
  soundEnabled: boolean;
}

export interface DisplaySettings {
  aiExplanationMode: boolean;
}

export interface DataManagementSettings {
  retentionPeriods: {
    reports: number; // days
    emails: number; // days
  };
  cleanupPreview: {
    cutoffDate: string;
    reportCount: number;
    itemCount: number;
    sizeToFree: number; // bytes
  } | null;
}

export type SettingsSection =
  | 'email'
  | 'schedule'
  | 'llm'
  | 'display'
  | 'notifications'
  | 'data';

export interface UpdateSettingsRequest {
  section: SettingsSection;
  updates: Partial<AllSettings>;
}

export interface AllSettings {
  email: EmailClientConfig;
  schedule: ScheduleConfig;
  llm: LLMConfig;
  notifications: NotificationSettings;
  display: DisplaySettings;
  data?: DataManagementSettings;
}
