/**
 * Settings management types
 * Per data-model.md section 6
 */

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

export interface AllSettings {
  email: any; // EmailClientConfig from onboarding
  schedule: any; // ScheduleConfig from onboarding
  llm: any; // LLMConfig from onboarding
  notifications: NotificationSettings;
  display: DisplaySettings;
}
