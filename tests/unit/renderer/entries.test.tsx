import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@renderer/app/OnboardingFlow', () => ({
    default: () => <div>mock-onboarding-flow</div>,
}));

describe('renderer entries', () => {
    beforeEach(() => {
        vi.resetModules();
        document.body.innerHTML = '<div id="root"></div>';
    });

    it('renders OnboardingApp through the onboarding entrypoint', async () => {
        const render = vi.fn();
        const createRoot = vi.fn(() => ({ render }));

        vi.doMock('react-dom/client', () => ({
            default: { createRoot },
            createRoot,
        }));
        vi.doMock('@renderer/app/OnboardingApp', () => ({
            default: () => <div>mock-onboarding-app</div>,
        }));

        await import('@renderer/onboarding');

        expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
        expect(render).toHaveBeenCalledOnce();
    });

    it('renders App through the main entrypoint', async () => {
        const render = vi.fn();
        const createRoot = vi.fn(() => ({ render }));

        vi.doMock('react-dom/client', () => ({
            default: { createRoot },
            createRoot,
        }));
        vi.doMock('@renderer/app/App', () => ({
            default: () => <div>mock-app</div>,
        }));

        await import('@renderer/main');

        expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
        expect(render).toHaveBeenCalledOnce();
    });

    it('renders the onboarding shell component', async () => {
        const { default: OnboardingApp } = await import('@renderer/app/OnboardingApp');

        const view = OnboardingApp({});

        expect(view).toBeTruthy();
    });
});
