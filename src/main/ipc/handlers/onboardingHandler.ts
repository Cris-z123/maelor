import { logger } from '../../config/logger.js';
export async function handleGetStatus(_event: Electron.IpcMainInvokeEvent) {
  const { default: OnboardingManager } = await import('../../onboarding/OnboardingManager.js');
  const state = OnboardingManager.getState();

  return {
    completed: state.completed,
    currentStep: state.currentStep,
    readablePstCount: state.readablePstCount,
    outlookDirectory: state.outlookDirectory || null,
  };
}

export async function handleDetectEmailClient(_event: Electron.IpcMainInvokeEvent) {
  try {
    logger.info('OnboardingHandler', 'Detect Outlook directory requested');
    const { default: OnboardingManager } = await import('../../onboarding/OnboardingManager.js');
    const result = OnboardingManager.detectOutlookDirectory();
    logger.info('OnboardingHandler', 'Detect Outlook directory succeeded', result);
    return result;
  } catch (error) {
    logger.error('OnboardingHandler', 'Detect Outlook directory failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function handleValidateEmailPath(_event: Electron.IpcMainInvokeEvent, path: string) {
  const { default: PstDiscovery } = await import('../../outlook/PstDiscovery.js');
  const { default: OnboardingManager } = await import('../../onboarding/OnboardingManager.js');
  const result = PstDiscovery.validateDirectory(path);
  OnboardingManager.recordValidation(path, result.readablePstCount);
  return result;
}

export async function handleTestConnection(
  _event: Electron.IpcMainInvokeEvent,
  config: { baseUrl: string; apiKey: string; model: string }
) {
  if (!config.baseUrl || !config.apiKey || !config.model) {
    throw new Error('Invalid AI configuration');
  }

  const { default: OnboardingManager } = await import('../../onboarding/OnboardingManager.js');
  return await OnboardingManager.testConnection(config);
}
