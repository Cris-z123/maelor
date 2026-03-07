import { describe, it, expect } from 'vitest';
import {
  OnboardingGetStatusRequestSchema,
  OnboardingGetStatusResponseSchema,
  OnboardingSetStepRequestSchema,
  OnboardingSetStepResponseSchema,
  OnboardingAcknowledgeRequestSchema,
  OnboardingAcknowledgeResponseSchema,
  OnboardingDetectEmailClientRequestSchema,
  OnboardingDetectEmailClientResponseSchema,
  OnboardingValidateEmailPathRequestSchema,
  OnboardingValidateEmailPathResponseSchema,
  OnboardingTestLLMConnectionRequestSchema,
  OnboardingTestLLMConnectionResponseSchema,
} from '../../../../../src/main/ipc/validators/onboarding';

describe('Onboarding Validators', () => {
  describe('OnboardingGetStatusRequestSchema', () => {
    it('should accept empty object', () => {
      const result = OnboardingGetStatusRequestSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject extra fields', () => {
      const result = OnboardingGetStatusRequestSchema.safeParse({
        extra: 'field',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('OnboardingSetStepRequestSchema', () => {
    it('should accept valid step 1 with email client', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 1,
        data: {
          emailClient: {
            type: 'thunderbird',
            path: '/path/to/profile',
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid step 2 with schedule', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 2,
        data: {
          schedule: {
            generationTime: { hour: 18, minute: 0 },
            skipWeekends: true,
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid step 3 with LLM config', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 3,
        data: {
          llm: {
            mode: 'remote',
            remoteEndpoint: 'https://api.openai.com/v1',
            apiKey: 'sk-12345678901234567890',
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid step number', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid hour (out of range)', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 2,
        data: {
          schedule: {
            generationTime: { hour: 25, minute: 0 },
            skipWeekends: true,
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid minute (out of range)', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 2,
        data: {
          schedule: {
            generationTime: { hour: 18, minute: 60 },
            skipWeekends: true,
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it('should accept remote mode with HTTP endpoint (url() accepts both)', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 3,
        data: {
          llm: {
            mode: 'remote',
            remoteEndpoint: 'http://api.example.com',
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject API key shorter than 20 characters', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 3,
        data: {
          llm: {
            mode: 'remote',
            apiKey: 'short',
          },
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('OnboardingDetectEmailClientRequestSchema', () => {
    const validTypes = ['thunderbird', 'outlook', 'apple-mail'] as const;

    validTypes.forEach((type) => {
      it(`should accept valid type: ${type}`, () => {
        const result = OnboardingDetectEmailClientRequestSchema.safeParse({
          type,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid email client type', () => {
      const result = OnboardingDetectEmailClientRequestSchema.safeParse({
        type: 'invalid-client',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing type field', () => {
      const result = OnboardingDetectEmailClientRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('OnboardingValidateEmailPathRequestSchema', () => {
    it('should accept non-empty path', () => {
      const result = OnboardingValidateEmailPathRequestSchema.safeParse({
        path: '/path/to/profile',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty string', () => {
      const result = OnboardingValidateEmailPathRequestSchema.safeParse({
        path: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing path field', () => {
      const result = OnboardingValidateEmailPathRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('OnboardingTestLLMConnectionRequestSchema', () => {
    it('should accept local mode with endpoint', () => {
      const result = OnboardingTestLLMConnectionRequestSchema.safeParse({
        mode: 'local',
        localEndpoint: 'http://localhost:11434',
      });
      expect(result.success).toBe(true);
    });

    it('should accept remote mode with HTTPS endpoint and API key', () => {
      const result = OnboardingTestLLMConnectionRequestSchema.safeParse({
        mode: 'remote',
        remoteEndpoint: 'https://api.openai.com/v1',
        apiKey: 'sk-12345678901234567890',
      });
      expect(result.success).toBe(true);
    });

    it('should accept remote mode with HTTP endpoint (url() accepts both)', () => {
      const result = OnboardingTestLLMConnectionRequestSchema.safeParse({
        mode: 'remote',
        remoteEndpoint: 'http://api.example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL format', () => {
      const result = OnboardingTestLLMConnectionRequestSchema.safeParse({
        mode: 'local',
        localEndpoint: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should reject extra fields (strict mode)', () => {
      const result = OnboardingTestLLMConnectionRequestSchema.safeParse({
        mode: 'local',
        localEndpoint: 'http://localhost:11434',
        extraField: 'should not be allowed',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('OnboardingAcknowledgeRequestSchema', () => {
    it('should accept empty object', () => {
      const result = OnboardingAcknowledgeRequestSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject extra fields (strict mode)', () => {
      const result = OnboardingAcknowledgeRequestSchema.safeParse({
        extra: 'field',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==================== RESPONSE SCHEMA TESTS ====================

  describe('OnboardingGetStatusResponseSchema', () => {
    it('should accept valid response with all fields', () => {
      const result = OnboardingGetStatusResponseSchema.safeParse({
        hasAcknowledgedDisclosure: true,
        disclosureVersion: '1.0.0',
        acknowledgedAt: 1234567890,
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid response without optional acknowledgedAt', () => {
      const result = OnboardingGetStatusResponseSchema.safeParse({
        hasAcknowledgedDisclosure: false,
        disclosureVersion: '1.0.0',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const result = OnboardingGetStatusResponseSchema.safeParse({
        hasAcknowledgedDisclosure: true,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type for hasAcknowledgedDisclosure', () => {
      const result = OnboardingGetStatusResponseSchema.safeParse({
        hasAcknowledgedDisclosure: 'true',
        disclosureVersion: '1.0.0',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type for acknowledgedAt', () => {
      const result = OnboardingGetStatusResponseSchema.safeParse({
        hasAcknowledgedDisclosure: true,
        disclosureVersion: '1.0.0',
        acknowledgedAt: 'not-a-number',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('OnboardingSetStepResponseSchema', () => {
    it('should accept successful response', () => {
      const result = OnboardingSetStepResponseSchema.safeParse({
        success: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept failed response with error message', () => {
      const result = OnboardingSetStepResponseSchema.safeParse({
        success: false,
        error: 'Invalid step data',
      });
      expect(result.success).toBe(true);
    });

    it('should accept response with optional error field as undefined', () => {
      const result = OnboardingSetStepResponseSchema.safeParse({
        success: true,
        error: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing success field', () => {
      const result = OnboardingSetStepResponseSchema.safeParse({
        error: 'Some error',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type for success', () => {
      const result = OnboardingSetStepResponseSchema.safeParse({
        success: 'true',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type for error', () => {
      const result = OnboardingSetStepResponseSchema.safeParse({
        success: false,
        error: 123,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('OnboardingAcknowledgeResponseSchema', () => {
    it('should accept successful response', () => {
      const result = OnboardingAcknowledgeResponseSchema.safeParse({
        success: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept failed response', () => {
      const result = OnboardingAcknowledgeResponseSchema.safeParse({
        success: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing success field', () => {
      const result = OnboardingAcknowledgeResponseSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject invalid type for success', () => {
      const result = OnboardingAcknowledgeResponseSchema.safeParse({
        success: 'true',
      });
      expect(result.success).toBe(false);
    });

    it('should accept extra fields in response (response schemas are not strict)', () => {
      const result = OnboardingAcknowledgeResponseSchema.safeParse({
        success: true,
        extraField: 'allowed in responses',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('OnboardingDetectEmailClientResponseSchema', () => {
    it('should accept response with detected path', () => {
      const result = OnboardingDetectEmailClientResponseSchema.safeParse({
        detectedPath: '/path/to/thunderbird',
      });
      expect(result.success).toBe(true);
    });

    it('should accept response with null detected path', () => {
      const result = OnboardingDetectEmailClientResponseSchema.safeParse({
        detectedPath: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept response with error', () => {
      const result = OnboardingDetectEmailClientResponseSchema.safeParse({
        detectedPath: null,
        error: 'Client not found',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing detectedPath field', () => {
      const result = OnboardingDetectEmailClientResponseSchema.safeParse({
        error: 'Some error',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type for detectedPath (non-string, non-null)', () => {
      const result = OnboardingDetectEmailClientResponseSchema.safeParse({
        detectedPath: 123,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type for error', () => {
      const result = OnboardingDetectEmailClientResponseSchema.safeParse({
        detectedPath: null,
        error: 123,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('OnboardingValidateEmailPathResponseSchema', () => {
    it('should accept valid response with valid path', () => {
      const result = OnboardingValidateEmailPathResponseSchema.safeParse({
        valid: true,
        message: 'Path is valid',
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid response with invalid path', () => {
      const result = OnboardingValidateEmailPathResponseSchema.safeParse({
        valid: false,
        message: 'Path does not exist',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing valid field', () => {
      const result = OnboardingValidateEmailPathResponseSchema.safeParse({
        message: 'Some message',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing message field', () => {
      const result = OnboardingValidateEmailPathResponseSchema.safeParse({
        valid: true,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type for valid', () => {
      const result = OnboardingValidateEmailPathResponseSchema.safeParse({
        valid: 'true',
        message: 'Path is valid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type for message', () => {
      const result = OnboardingValidateEmailPathResponseSchema.safeParse({
        valid: true,
        message: 123,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('OnboardingTestLLMConnectionResponseSchema', () => {
    it('should accept successful response', () => {
      const result = OnboardingTestLLMConnectionResponseSchema.safeParse({
        success: true,
        responseTime: 150,
      });
      expect(result.success).toBe(true);
    });

    it('should accept failed response with error', () => {
      const result = OnboardingTestLLMConnectionResponseSchema.safeParse({
        success: false,
        responseTime: 0,
        error: 'Connection failed',
      });
      expect(result.success).toBe(true);
    });

    it('should accept response without optional error', () => {
      const result = OnboardingTestLLMConnectionResponseSchema.safeParse({
        success: true,
        responseTime: 200,
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing success field', () => {
      const result = OnboardingTestLLMConnectionResponseSchema.safeParse({
        responseTime: 150,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing responseTime field', () => {
      const result = OnboardingTestLLMConnectionResponseSchema.safeParse({
        success: true,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type for success', () => {
      const result = OnboardingTestLLMConnectionResponseSchema.safeParse({
        success: 'true',
        responseTime: 150,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type for responseTime', () => {
      const result = OnboardingTestLLMConnectionResponseSchema.safeParse({
        success: true,
        responseTime: '150',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type for error', () => {
      const result = OnboardingTestLLMConnectionResponseSchema.safeParse({
        success: false,
        responseTime: 0,
        error: 500,
      });
      expect(result.success).toBe(false);
    });
  });

  // ==================== BOUNDARY VALUE TESTS ====================

  describe('GenerationTime boundary values', () => {
    it('should accept minimum hour (0)', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 2,
        data: {
          schedule: {
            generationTime: { hour: 0, minute: 0 },
            skipWeekends: true,
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept maximum hour (23)', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 2,
        data: {
          schedule: {
            generationTime: { hour: 23, minute: 59 },
            skipWeekends: false,
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept minimum minute (0)', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 2,
        data: {
          schedule: {
            generationTime: { hour: 12, minute: 0 },
            skipWeekends: true,
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept maximum minute (59)', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 2,
        data: {
          schedule: {
            generationTime: { hour: 12, minute: 59 },
            skipWeekends: false,
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject hour below minimum (-1)', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 2,
        data: {
          schedule: {
            generationTime: { hour: -1, minute: 0 },
            skipWeekends: true,
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject hour above maximum (24)', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 2,
        data: {
          schedule: {
            generationTime: { hour: 24, minute: 0 },
            skipWeekends: true,
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject minute below minimum (-1)', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 2,
        data: {
          schedule: {
            generationTime: { hour: 12, minute: -1 },
            skipWeekends: true,
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject minute above maximum (60)', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 2,
        data: {
          schedule: {
            generationTime: { hour: 12, minute: 60 },
            skipWeekends: true,
          },
        },
      });
      expect(result.success).toBe(false);
    });
  });

  // ==================== API KEY EXACT LENGTH TEST ====================

  describe('API key validation', () => {
    it('should accept API key with exactly 20 characters', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 3,
        data: {
          llm: {
            mode: 'remote',
            apiKey: '12345678901234567890',
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept API key with more than 20 characters', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 3,
        data: {
          llm: {
            mode: 'remote',
            apiKey: '1234567890123456789012345',
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject API key with less than 20 characters', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 3,
        data: {
          llm: {
            mode: 'remote',
            apiKey: '1234567890123456789',
          },
        },
      });
      expect(result.success).toBe(false);
    });
  });

  // ==================== STRICT MODE TESTS ====================

  describe('OnboardingSetStepRequestSchema strict mode', () => {
    it('should reject extra fields at root level', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 1,
        data: {
          emailClient: {
            type: 'thunderbird',
            path: '/path/to/profile',
          },
        },
        extraField: 'should not be allowed',
      });
      expect(result.success).toBe(false);
    });

    it('should accept extra fields in data object (data is not strict)', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 1,
        data: {
          emailClient: {
            type: 'thunderbird',
            path: '/path/to/profile',
          },
          extraData: 'allowed in non-strict data object',
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('OnboardingDetectEmailClientRequestSchema strict mode', () => {
    it('should reject extra fields', () => {
      const result = OnboardingDetectEmailClientRequestSchema.safeParse({
        type: 'thunderbird',
        extraField: 'should not be allowed',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('OnboardingValidateEmailPathRequestSchema strict mode', () => {
    it('should reject extra fields', () => {
      const result = OnboardingValidateEmailPathRequestSchema.safeParse({
        path: '/path/to/profile',
        extraField: 'should not be allowed',
      });
      expect(result.success).toBe(false);
    });
  });
});
