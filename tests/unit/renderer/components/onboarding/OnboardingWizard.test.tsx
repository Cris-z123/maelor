/**
 * OnboardingFlow Component Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import OnboardingFlow from '@renderer/app/OnboardingFlow';

const { mockApi } = vi.hoisted(() => ({
    mockApi: {
        getOnboardingStatus: vi.fn(),
        getSettingsSummary: vi.fn(),
        detectOutlookDirectory: vi.fn(),
        validateOutlookDirectory: vi.fn(),
        testConnection: vi.fn(),
        completeSetup: vi.fn(),
    },
}));

vi.mock('@renderer/app/appApi', () => ({
    appApi: mockApi,
}));

describe('OnboardingFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockApi.getOnboardingStatus.mockResolvedValue({
            completed: false,
            currentStep: 1,
            readablePstCount: 0,
            outlookDirectory: null,
        });
        mockApi.getSettingsSummary.mockResolvedValue({
            outlookDirectory: '',
            aiBaseUrl: 'https://api.openai.com/v1',
            aiModel: 'gpt-4.1-mini',
            databasePath: '',
            databaseSizeBytes: 0,
        });
        mockApi.detectOutlookDirectory.mockResolvedValue(
            'C:\\Users\\User\\Documents\\Outlook Files',
        );
        mockApi.validateOutlookDirectory.mockResolvedValue({
            valid: true,
            readablePstCount: 1,
            unreadablePstCount: 0,
            files: [
                {
                    path: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
                    fileName: 'mailbox.pst',
                    sizeBytes: 1024 * 1024,
                    modifiedAt: 1,
                    readability: 'readable',
                    reason: null,
                },
            ],
            message: 'Found 1 readable PST file.',
        });
        mockApi.testConnection.mockResolvedValue({
            success: true,
            responseTimeMs: 120,
            message: 'AI connection succeeded.',
        });
        mockApi.completeSetup.mockResolvedValue({ success: true });
    });

    it('hydrates the flow from onboarding status and settings', async () => {
        render(<OnboardingFlow />);

        await waitFor(() => expect(mockApi.getOnboardingStatus).toHaveBeenCalledOnce());

        expect(screen.getByRole('heading', { name: 'Outlook PST 直连初始化' })).toBeInTheDocument();
        expect(screen.getByDisplayValue('https://api.openai.com/v1')).toBeInTheDocument();
        expect(screen.getByDisplayValue('gpt-4.1-mini')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '完成配置' })).toBeDisabled();
    });

    it('completes the 3-step onboarding flow after validation and AI connection succeed', async () => {
        const user = userEvent.setup();
        const onCompleted = vi.fn();

        render(<OnboardingFlow onCompleted={onCompleted} />);

        await waitFor(() => expect(mockApi.getSettingsSummary).toHaveBeenCalledOnce());

        await user.click(screen.getByRole('button', { name: '尝试自动检测' }));
        expect(
            await screen.findByDisplayValue('C:\\Users\\User\\Documents\\Outlook Files'),
        ).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: '验证目录并发现 PST' }));
        expect(await screen.findByText('mailbox.pst')).toBeInTheDocument();

        await user.type(screen.getByPlaceholderText('sk-...'), 'sk-test-key');
        await user.click(screen.getByRole('button', { name: '测试连接' }));
        expect(await screen.findByText('连接成功 · 120ms')).toBeInTheDocument();

        const completeButton = screen.getByRole('button', { name: '完成配置' });
        await waitFor(() => expect(completeButton).toBeEnabled());
        await user.click(completeButton);

        await waitFor(() =>
            expect(mockApi.completeSetup).toHaveBeenCalledWith({
                directoryPath: 'C:\\Users\\User\\Documents\\Outlook Files',
                baseUrl: 'https://api.openai.com/v1',
                apiKey: 'sk-test-key',
                model: 'gpt-4.1-mini',
            }),
        );

        expect(await screen.findByText('配置已完成。')).toBeInTheDocument();
        expect(onCompleted).toHaveBeenCalledOnce();
    });
});
