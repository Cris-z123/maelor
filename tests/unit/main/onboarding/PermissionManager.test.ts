import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dialog, Notification } from 'electron';

vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: vi.fn(),
  },
  Notification: {
    isSupported: vi.fn(() => true),
    permissionChecker: vi.fn(() => 'granted'),
  },
}));

describe('PermissionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should grant file system access when user selects path', async () => {
    const { PermissionManager } = await import('@/onboarding/PermissionManager.js');

    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ['C:\\Users\\test\\Thunderbird'],
    } as any);

    const result = await PermissionManager.requestFileSystemAccess();

    expect(result.granted).toBe(true);
    expect(result.restrictedMode).toBe(false);
  });

  it('should enter restricted mode when user cancels dialog', async () => {
    const { PermissionManager } = await import('@/onboarding/PermissionManager.js');

    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: true,
      filePaths: [],
    } as any);

    const result = await PermissionManager.requestFileSystemAccess();

    expect(result.granted).toBe(false);
    expect(result.restrictedMode).toBe(true);
  });

  it('should handle dialog errors gracefully', async () => {
    const { PermissionManager } = await import('@/onboarding/PermissionManager.js');

    vi.mocked(dialog.showOpenDialog).mockRejectedValue(new Error('Dialog failed'));

    const result = await PermissionManager.requestFileSystemAccess();

    expect(result.granted).toBe(false);
    expect(result.restrictedMode).toBe(true);
  });

  it('should check notification permission status', async () => {
    const { PermissionManager } = await import('@/onboarding/PermissionManager.js');

    const result = await PermissionManager.checkPermissions();

    expect(result).toHaveProperty('fileSystem');
    expect(result).toHaveProperty('notifications');
    expect(['granted', 'denied', 'prompt']).toContain(result.notifications);
  });
});
