import { useState, useCallback } from 'react';
import { clipboard } from 'electron';

export interface UseClipboardReturn {
  copy: (text: string) => Promise<boolean>;
  copied: boolean;
}

export function useClipboard(): UseClipboardReturn {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    try {
      await clipboard.writeText(text);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1000);

      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    copy,
    copied,
  };
}
