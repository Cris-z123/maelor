/**
 * Onboarding Window
 *
 * Creates and manages the onboarding wizard window for first-time users.
 * Window is modal, always on top, and prevents navigation away from the wizard.
 *
 * Per plan.md T032
 */

import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Create onboarding wizard window
 *
 * Features:
 * - Fixed size (900x700, min 800x600)
 * - Always on top to prevent losing focus
 * - Resizable disabled for consistent UX
 * - Auto-hide menu bar for cleaner appearance
 * - Sandboxed with context isolation for security
 * - Navigation prevention to keep user in wizard
 */
export function createOnboardingWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    resizable: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, '../../../electron/preload.js'),
    },
  });

  // Load onboarding page
  if (process.env.NODE_ENV === 'development') {
    window.loadURL('http://localhost:3000/onboarding.html');
    window.webContents.openDevTools();
  } else {
    window.loadFile(path.join(__dirname, '../../renderer/onboarding.html'));
  }

  // Show window when ready
  window.once('ready-to-show', () => {
    window.show();
  });

  // Prevent navigation away from onboarding
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault();
    }
  });

  return window;
}
