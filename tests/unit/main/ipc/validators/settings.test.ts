import { describe, it, expect } from 'vitest';
import {
  SettingsUpdateRequestSchema,
  SettingsCleanupDataRequestSchema,
  SettingsDestroyFeedbackRequestSchema,
} from '../../../../../src/main/ipc/validators/settings';

describe('Settings Validators', () => {
  describe('SettingsUpdateRequestSchema', () => {
    it('should accept valid email section update', () => {
      const result = SettingsUpdateRequestSchema.safeParse({
        section: 'email',
        updates: {
          email: {
            clientType: 'thunderbird',
            path: '/new/path',
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid schedule section update', () => {
      const result = SettingsUpdateRequestSchema.safeParse({
        section: 'schedule',
        updates: {
          schedule: {
            generationTime: { hour: 19, minute: 30 },
            skipWeekends: false,
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid llm section update with local mode', () => {
      const result = SettingsUpdateRequestSchema.safeParse({
        section: 'llm',
        updates: {
          llm: {
            mode: 'local',
            endpoint: 'http://localhost:11434',
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid llm section update with remote mode', () => {
      const result = SettingsUpdateRequestSchema.safeParse({
        section: 'llm',
        updates: {
          llm: {
            mode: 'remote',
            endpoint: 'https://api.openai.com/v1',
            apiKey: 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz',
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid display section update', () => {
      const result = SettingsUpdateRequestSchema.safeParse({
        section: 'display',
        updates: {
          display: {
            aiExplanationMode: true,
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid notifications section update', () => {
      const result = SettingsUpdateRequestSchema.safeParse({
        section: 'notifications',
        updates: {
          notifications: {
            enabled: true,
            doNotDisturb: {
              enabled: false,
              startTime: '22:00',
              endTime: '08:00',
            },
            sound: true,
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept partial notifications update', () => {
      const result = SettingsUpdateRequestSchema.safeParse({
        section: 'notifications',
        updates: {
          notifications: {
            enabled: false,
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid section name', () => {
      const result = SettingsUpdateRequestSchema.safeParse({
        section: 'invalid-section',
        updates: {},
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing section field', () => {
      const result = SettingsUpdateRequestSchema.safeParse({
        updates: {},
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing updates field', () => {
      const result = SettingsUpdateRequestSchema.safeParse({
        section: 'email',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid schedule generation time hour', () => {
      const result = SettingsUpdateRequestSchema.safeParse({
        section: 'schedule',
        updates: {
          schedule: {
            generationTime: { hour: 25, minute: 30 },
            skipWeekends: false,
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid schedule generation time minute', () => {
      const result = SettingsUpdateRequestSchema.safeParse({
        section: 'schedule',
        updates: {
          schedule: {
            generationTime: { hour: 19, minute: 70 },
            skipWeekends: false,
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject remote LLM with non-HTTPS endpoint', () => {
      const result = SettingsUpdateRequestSchema.safeParse({
        section: 'llm',
        updates: {
          llm: {
            mode: 'remote',
            endpoint: 'http://api.example.com',
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject remote LLM with short API key', () => {
      const result = SettingsUpdateRequestSchema.safeParse({
        section: 'llm',
        updates: {
          llm: {
            mode: 'remote',
            endpoint: 'https://api.openai.com/v1',
            apiKey: 'short',
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email client type', () => {
      const result = SettingsUpdateRequestSchema.safeParse({
        section: 'email',
        updates: {
          email: {
            clientType: 'gmail',
            path: '/path',
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it('should accept empty email path', () => {
      const result = SettingsUpdateRequestSchema.safeParse({
        section: 'email',
        updates: {
          email: {
            path: '',
          },
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('SettingsCleanupDataRequestSchema', () => {
    it('should accept valid date range option - 30天前', () => {
      const result = SettingsCleanupDataRequestSchema.safeParse({
        dateRange: '30天前',
      });
      expect(result.success).toBe(true);
    });

    it('should accept custom range option - 自定义范围', () => {
      const result = SettingsCleanupDataRequestSchema.safeParse({
        dateRange: '自定义范围',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid date range', () => {
      const result = SettingsCleanupDataRequestSchema.safeParse({
        dateRange: 'invalid-range',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing dateRange field', () => {
      const result = SettingsCleanupDataRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject extra fields in request', () => {
      const result = SettingsCleanupDataRequestSchema.safeParse({
        dateRange: '30天前',
        extraField: 'should not be here',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty string date range', () => {
      const result = SettingsCleanupDataRequestSchema.safeParse({
        dateRange: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SettingsDestroyFeedbackRequestSchema', () => {
    it('should accept exact confirmation phrase', () => {
      const result = SettingsDestroyFeedbackRequestSchema.safeParse({
        confirmation: '确认删除',
      });
      expect(result.success).toBe(true);
    });

    it('should reject incorrect confirmation phrase - English', () => {
      const result = SettingsDestroyFeedbackRequestSchema.safeParse({
        confirmation: 'delete',
      });
      expect(result.success).toBe(false);
    });

    it('should reject incorrect confirmation phrase - similar but not exact', () => {
      const result = SettingsDestroyFeedbackRequestSchema.safeParse({
        confirmation: '确认删',
      });
      expect(result.success).toBe(false);
    });

    it('should reject incorrect confirmation phrase - with extra space', () => {
      const result = SettingsDestroyFeedbackRequestSchema.safeParse({
        confirmation: '确认删除 ',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty confirmation', () => {
      const result = SettingsDestroyFeedbackRequestSchema.safeParse({
        confirmation: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing confirmation field', () => {
      const result = SettingsDestroyFeedbackRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject confirmation with wrong characters', () => {
      const result = SettingsDestroyFeedbackRequestSchema.safeParse({
        confirmation: 'confirm delete',
      });
      expect(result.success).toBe(false);
    });

    it('should reject case-sensitive mismatch (different characters)', () => {
      const result = SettingsDestroyFeedbackRequestSchema.safeParse({
        confirmation: '確認刪除', // Different variant of Chinese characters
      });
      expect(result.success).toBe(false);
    });

    it('should reject extra fields in request', () => {
      const result = SettingsDestroyFeedbackRequestSchema.safeParse({
        confirmation: '确认删除',
        extraField: 'should not be here',
      });
      expect(result.success).toBe(false);
    });
  });
});
